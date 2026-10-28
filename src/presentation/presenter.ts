export class Presenter {
  private listeners = new Set<() => void>()

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  protected notify(): void {
    this.listeners.forEach((listener) => listener())
  }
}
