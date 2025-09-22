from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date
from decimal import Decimal

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Retail Store API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ================ MODELS ================

class DailySaleCreate(BaseModel):
    date: date
    total_sales: float
    notes: Optional[str] = None

class DailySale(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: date
    total_sales: float
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ExpenseCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#3B82F6"  # Default blue color

class ExpenseCategory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    color: str = "#3B82F6"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ExpenseCreate(BaseModel):
    date: date
    category_id: str
    description: str
    amount: float

class Expense(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: date
    category_id: str
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    description: str
    amount: float
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DailyReport(BaseModel):
    date: date
    total_sales: float
    total_expenses: float
    net_profit: float
    expenses_by_category: List[dict]

class MonthlyReport(BaseModel):
    year: int
    month: int
    total_sales: float
    total_expenses: float
    net_profit: float
    daily_data: List[dict]
    expenses_by_category: List[dict]

# ================ DAILY SALES ENDPOINTS ================

@api_router.post("/daily-sales", response_model=DailySale)
async def create_daily_sale(sale_data: DailySaleCreate):
    # Check if sale for this date already exists
    existing_sale = await db.daily_sales.find_one({"date": sale_data.date.isoformat()})
    if existing_sale:
        # Update existing sale
        await db.daily_sales.update_one(
            {"date": sale_data.date.isoformat()},
            {"$set": {"total_sales": sale_data.total_sales, "notes": sale_data.notes}}
        )
        updated_sale = await db.daily_sales.find_one({"date": sale_data.date.isoformat()})
        return DailySale(**updated_sale)
    else:
        # Create new sale
        sale_dict = sale_data.dict()
        sale_dict["date"] = sale_data.date.isoformat()
        sale_obj = DailySale(**sale_dict)
        sale_doc = sale_obj.dict()
        sale_doc["date"] = sale_obj.date.isoformat()
        await db.daily_sales.insert_one(sale_doc)
        return sale_obj

@api_router.get("/daily-sales/{date_str}")
async def get_daily_sale(date_str: str):
    sale = await db.daily_sales.find_one({"date": date_str}, {"_id": 0})
    if not sale:
        return {"date": date_str, "total_sales": 0, "notes": None}
    return sale

@api_router.get("/daily-sales")
async def get_daily_sales(start_date: Optional[str] = None, end_date: Optional[str] = None):
    query = {}
    if start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    sales = await db.daily_sales.find(query, {"_id": 0}).sort("date", -1).to_list(100)
    return sales

# ================ EXPENSE CATEGORIES ENDPOINTS ================

@api_router.post("/expense-categories", response_model=ExpenseCategory)
async def create_expense_category(category_data: ExpenseCategoryCreate):
    category_obj = ExpenseCategory(**category_data.dict())
    await db.expense_categories.insert_one(category_obj.dict())
    return category_obj

@api_router.get("/expense-categories", response_model=List[ExpenseCategory])
async def get_expense_categories():
    categories = await db.expense_categories.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    return [ExpenseCategory(**cat) for cat in categories]

@api_router.put("/expense-categories/{category_id}", response_model=ExpenseCategory)
async def update_expense_category(category_id: str, category_data: ExpenseCategoryCreate):
    result = await db.expense_categories.update_one(
        {"id": category_id},
        {"$set": category_data.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    updated_category = await db.expense_categories.find_one({"id": category_id})
    return ExpenseCategory(**updated_category)

@api_router.delete("/expense-categories/{category_id}")
async def delete_expense_category(category_id: str):
    # Check if category has expenses
    expense_count = await db.expenses.count_documents({"category_id": category_id})
    if expense_count > 0:
        raise HTTPException(status_code=400, detail="Cannot delete category with existing expenses")
    
    result = await db.expense_categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted successfully"}

# ================ EXPENSES ENDPOINTS ================

@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_data: ExpenseCreate):
    # Get category info
    category = await db.expense_categories.find_one({"id": expense_data.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    expense_dict = expense_data.dict()
    expense_dict["date"] = expense_data.date.isoformat()
    expense_dict["category_name"] = category["name"]
    expense_dict["category_color"] = category["color"]
    
    expense_obj = Expense(**expense_dict)
    expense_doc = expense_obj.dict()
    expense_doc["date"] = expense_obj.date.isoformat()
    
    await db.expenses.insert_one(expense_doc)
    return expense_obj

@api_router.get("/expenses")
async def get_expenses(date_str: Optional[str] = None, start_date: Optional[str] = None, end_date: Optional[str] = None):
    query = {}
    if date_str:
        query["date"] = date_str
    elif start_date and end_date:
        query["date"] = {"$gte": start_date, "$lte": end_date}
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return expenses

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted successfully"}

# ================ REPORTS ENDPOINTS ================

@api_router.get("/reports/daily/{date_str}", response_model=DailyReport)
async def get_daily_report(date_str: str):
    # Get daily sale
    sale = await db.daily_sales.find_one({"date": date_str})
    total_sales = sale["total_sales"] if sale else 0
    
    # Get expenses for the day
    expenses = await db.expenses.find({"date": date_str}).to_list(1000)
    total_expenses = sum(exp["amount"] for exp in expenses)
    
    # Group expenses by category
    expenses_by_category = {}
    for exp in expenses:
        cat_name = exp["category_name"]
        if cat_name not in expenses_by_category:
            expenses_by_category[cat_name] = {
                "category": cat_name,
                "color": exp["category_color"],
                "total": 0,
                "count": 0
            }
        expenses_by_category[cat_name]["total"] += exp["amount"]
        expenses_by_category[cat_name]["count"] += 1
    
    return DailyReport(
        date=date_str,
        total_sales=total_sales,
        total_expenses=total_expenses,
        net_profit=total_sales - total_expenses,
        expenses_by_category=list(expenses_by_category.values())
    )

@api_router.get("/reports/monthly/{year}/{month}", response_model=MonthlyReport)
async def get_monthly_report(year: int, month: int):
    # Date range for the month
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    # Get all sales for the month
    sales = await db.daily_sales.find({
        "date": {"$gte": start_date, "$lt": end_date}
    }).to_list(1000)
    
    # Get all expenses for the month
    expenses = await db.expenses.find({
        "date": {"$gte": start_date, "$lt": end_date}
    }).to_list(1000)
    
    total_sales = sum(sale["total_sales"] for sale in sales)
    total_expenses = sum(exp["amount"] for exp in expenses)
    
    # Daily data
    daily_data = {}
    for sale in sales:
        date_key = sale["date"]
        daily_data[date_key] = {"date": date_key, "sales": sale["total_sales"], "expenses": 0}
    
    for exp in expenses:
        date_key = exp["date"]
        if date_key not in daily_data:
            daily_data[date_key] = {"date": date_key, "sales": 0, "expenses": 0}
        daily_data[date_key]["expenses"] += exp["amount"]
    
    # Add profit calculation
    for key in daily_data:
        daily_data[key]["profit"] = daily_data[key]["sales"] - daily_data[key]["expenses"]
    
    # Expenses by category
    expenses_by_category = {}
    for exp in expenses:
        cat_name = exp["category_name"]
        if cat_name not in expenses_by_category:
            expenses_by_category[cat_name] = {
                "category": cat_name,
                "color": exp["category_color"],
                "total": 0,
                "count": 0
            }
        expenses_by_category[cat_name]["total"] += exp["amount"]
        expenses_by_category[cat_name]["count"] += 1
    
    return MonthlyReport(
        year=year,
        month=month,
        total_sales=total_sales,
        total_expenses=total_expenses,
        net_profit=total_sales - total_expenses,
        daily_data=sorted(daily_data.values(), key=lambda x: x["date"]),
        expenses_by_category=list(expenses_by_category.values())
    )

# ================ INITIALIZATION ================

@api_router.post("/init-categories")
async def initialize_default_categories():
    """Initialize default expense categories for a retail store"""
    default_categories = [
        {"name": "Bebidas", "description": "Agua, gaseosas, jugos", "color": "#3B82F6"},
        {"name": "Lácteos", "description": "Leche, queso, yogurt", "color": "#10B981"},
        {"name": "Verduras y Frutas", "description": "Productos frescos", "color": "#F59E0B"},
        {"name": "Panadería", "description": "Pan, galletas, pasteles", "color": "#EF4444"},
        {"name": "Bebidas Alcohólicas", "description": "Cerveza, licores", "color": "#8B5CF6"},
        {"name": "Abarrotes", "description": "Arroz, aceite, enlatados", "color": "#6B7280"},
        {"name": "Snacks y Dulces", "description": "Papas, dulces, chocolates", "color": "#EC4899"},
        {"name": "Servicios", "description": "Luz, agua, alquiler", "color": "#14B8A6"},
    ]
    
    for cat_data in default_categories:
        # Check if category already exists
        existing = await db.expense_categories.find_one({"name": cat_data["name"]})
        if not existing:
            category_obj = ExpenseCategory(**cat_data)
            await db.expense_categories.insert_one(category_obj.dict())
    
    return {"message": "Default categories initialized"}

# ================ ROOT ROUTES ================

@api_router.get("/")
async def root():
    return {"message": "Retail Store API - Ready"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()