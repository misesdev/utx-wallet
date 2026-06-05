export class AppError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'AppError';
    // Required for correct instanceof checks when targeting ES5 (Hermes engine)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
