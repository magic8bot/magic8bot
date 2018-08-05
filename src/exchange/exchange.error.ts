import {
  BaseError,
  ExchangeError,
  NotSupported,
  AuthenticationError,
  InvalidNonce,
  InsufficientFunds,
  InvalidOrder,
  OrderNotFound,
  OrderNotCached,
  CancelPending,
  NetworkError,
  DDoSProtection,
  RequestTimeout,
  ExchangeNotAvailable,
} from 'ccxt'

interface RecoverRetry {
  recover: boolean
  retry: boolean
}

export class ExchangeErrorHandler {
  public catch(e: Error): boolean {
    console.error(e)
    const { recover, retry } = e instanceof BaseError ? this.handleBaseError(e) : this.handleError(e)
    if (!recover) process.exit()

    return retry
  }

  // Not an exchange specific error
  private handleError(e: Error): RecoverRetry {
    return { recover: true, retry: false }
  }

  private handleBaseError(e: BaseError): RecoverRetry {
    return e instanceof ExchangeError ? this.handleExchangeError(e) : this.handleNetworkError(e)
  }

  private handleExchangeError(e: ExchangeError): RecoverRetry {
    if (e instanceof NotSupported) return this.handleNotSupported(e)
    if (e instanceof AuthenticationError) return this.handleAuthenticationError(e)
    if (e instanceof InvalidNonce) return this.handleInvalidNonce(e)
    if (e instanceof InsufficientFunds) return this.handleInsufficientFunds(e)
    if (e instanceof InvalidOrder) return this.handleInvalidOrder(e)
    return this.handleError(e)
  }

  private handleNotSupported(e: NotSupported): RecoverRetry {
    return { recover: false, retry: false }
  }

  private handleAuthenticationError(e: AuthenticationError): RecoverRetry {
    return { recover: false, retry: false }
  }

  private handleInvalidNonce(e: InvalidNonce): RecoverRetry {
    return { recover: true, retry: false }
  }

  private handleInsufficientFunds(e: InsufficientFunds): RecoverRetry {
    return { recover: true, retry: false }
  }

  private handleInvalidOrder(e: InvalidOrder): RecoverRetry {
    if (e instanceof OrderNotFound) return this.handleOrderNotFound(e)
    if (e instanceof OrderNotCached) return this.handleOrderNotCached(e)
    if (e instanceof CancelPending) return this.handleCancelPending(e)
    return this.handleError(e)
  }

  private handleOrderNotFound(e: OrderNotFound): RecoverRetry {
    return { recover: true, retry: false }
  }

  private handleOrderNotCached(e: OrderNotCached): RecoverRetry {
    return { recover: true, retry: false }
  }

  private handleCancelPending(e: CancelPending): RecoverRetry {
    return { recover: true, retry: false }
  }

  private handleNetworkError(e: NetworkError): RecoverRetry {
    if (e instanceof DDoSProtection) return this.handleDDoSProtection(e)
    if (e instanceof RequestTimeout) return this.handleRequestTimeout(e)
    if (e instanceof ExchangeNotAvailable) return this.handleExchangeNotAvailable(e)
    return this.handleError(e)
  }

  private handleDDoSProtection(e: DDoSProtection): RecoverRetry {
    return { recover: true, retry: true }
  }

  private handleRequestTimeout(e: RequestTimeout): RecoverRetry {
    return { recover: true, retry: true }
  }

  private handleExchangeNotAvailable(e: ExchangeNotAvailable): RecoverRetry {
    return { recover: true, retry: true }
  }
}
