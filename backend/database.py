from motor.motor_asyncio import AsyncIOMotorClient
import os
from functools import lru_cache

@lru_cache()
def get_database_url():
    return os.environ.get('MONGO_URL')

@lru_cache() 
def get_database_name():
    return os.environ.get('DB_NAME', 'linkhub')

# Cliente global de MongoDB
client = None
database = None

async def connect_to_mongo():
    global client, database
    client = AsyncIOMotorClient(get_database_url())
    database = client[get_database_name()]
    return database

async def close_mongo_connection():
    global client
    if client:
        client.close()

async def get_database():
    global database
    if database is None:
        database = await connect_to_mongo()
    return database