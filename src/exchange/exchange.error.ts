import { BaseError, ExchangeError, NetworkError, DDoSProtection, RequestTimeout, ExchangeNotAvailable } from 'ccxt'

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
    if (e instanceof ExchangeError) throw e
    return this.handleNetworkError(e)
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
