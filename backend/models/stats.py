from pydantic import BaseModel

class StatsResponse(BaseModel):
    total_companies: int
    monthly_visitors: int
    avg_traffic_increase: int
    customer_satisfaction: float