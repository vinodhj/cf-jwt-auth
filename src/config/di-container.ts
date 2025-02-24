// diContainer.ts
export class DIContainer {
  private readonly dependencies = new Map<string, unknown>();

  // Register an instance of a dependency
  register<T>(key: string, instance: T): void {
    this.dependencies.set(key, instance);
  }

  // Retrieve an instance of a dependency
  resolve<T>(key: string): T {
    if (!this.dependencies.has(key)) {
      throw new Error(`Dependency ${key} not found`);
    }
    return this.dependencies.get(key) as T;
  }
}
