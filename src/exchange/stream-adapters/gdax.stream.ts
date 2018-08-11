import { StreamExchangeAdapter } from './stream.base'

export const gdaxStream: StreamExchangeAdapter = {
  handleMessage(message: any) {
    console.log(message)
  },
  getSubscription(products: string[]) {
    return {
      type: 'subscribe',
      product_ids: products,
      channels: [
        'matches',
        'heartbeat',
        {
          name: 'matches',
          product_ids: products,
        },
      ],
    }
  },
}
