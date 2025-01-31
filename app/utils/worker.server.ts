export class BackgroundWorker {
  private worker: Worker | null = null;

  constructor() {
    // Only create worker in browser environment
    if (typeof window !== 'undefined') {
      this.worker = new Worker(
        new URL('../workers/background.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
  }

  async executeTask(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      // Listen for the response
      const handleMessage = (event: MessageEvent) => {
        console.log("handleMessage", event);
        if (event.data.type === 'TASK_COMPLETE') {
          this.worker?.removeEventListener('message', handleMessage);
          resolve(event.data.data);
        }
      };

      this.worker.addEventListener('message', handleMessage);

      // Send the task to the worker
      this.worker.postMessage({
        type: 'PROCESS_TASK',
        data
      });
    });
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
  }
} 