import dotenv from "dotenv";

dotenv.config();

interface Order {
  id: string;
  customerId: string;
  items: any[];
  status: string;
  createdAt: Date;
}

class OrderWorker {
  private isRunning: boolean = false;

  start(): void {
    this.isRunning = true;
    console.log("Order Worker started");
    this.processOrders();
  }

  stop(): void {
    this.isRunning = false;
    console.log("Order Worker stopped");
  }

  private async processOrders(): Promise<void> {
    while (this.isRunning) {
      try {
        // Simulate processing orders from queue
        console.log(
          `[${new Date().toISOString()}] Checking for orders to process...`
        );

        // Placeholder: In production, this would connect to a message queue
        // and process orders asynchronously

        await this.sleep(5000); // Check every 5 seconds
      } catch (error) {
        console.error("Error processing orders:", error);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async processOrder(order: Order): Promise<void> {
    console.log(`Processing order: ${order.id}`);
    // Placeholder: Add order processing logic here
    order.status = "processing";
    console.log(`Order ${order.id} status updated to: ${order.status}`);
  }
}

// Initialize and start the worker
const worker = new OrderWorker();
worker.start();

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  worker.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  worker.stop();
  process.exit(0);
});

export default OrderWorker;
