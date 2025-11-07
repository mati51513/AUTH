class ErrorResponse extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    // Maintain proper stack trace for where error was thrown (only on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = { ErrorResponse };

