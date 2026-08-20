import asyncio
import traceback
from agent import initiate_call, OrderRequest

class DummyBackgroundTasks:
    def add_task(self, func, *args, **kwargs):
        print("DummyBackgroundTasks.add_task called; not executing task")

async def main():
    order = OrderRequest(orderId="test123", customerName="Alice", total=12.34, items=[{"product":{"name":"Widget"},"quantity":1,"price":12.34}])
    try:
        result = await initiate_call(order, DummyBackgroundTasks())
        print('Result:', result)
    except Exception as e:
        print('Exception raised in initiate_call:')
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(main())
