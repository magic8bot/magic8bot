const mockId = 'test'

import { MarkerStore } from './marker.store'

describe('MarkerStore', () => {
  const storeOpts = { exchange: mockId, symbol: mockId }
  let markerStore: MarkerStore

  beforeAll(() => {
    markerStore = MarkerStore.instance
  })

  describe('getNextBackMarker', () => {
    test('returns null if no record in db', async () => {
      jest.spyOn<any, any>(markerStore, 'getMarker').mockReturnValueOnce(null)

      const result = await markerStore.getNextBackMarker(storeOpts)

      expect(result).toEqual(null)
    })

    test('returns null if `from` is missing', async () => {
      jest.spyOn<any, any>(markerStore, 'getMarker').mockReturnValueOnce({})

      const result = await markerStore.getNextBackMarker(storeOpts)

      expect(result).toEqual(null)
    })

    test('returns marker from if not found in range', async () => {
      jest.spyOn<any, any>(markerStore, 'getMarker').mockReturnValueOnce({ from: true })
      jest.spyOn<any, any>(markerStore, 'findInRange').mockReturnValueOnce(null)

      const result = await markerStore.getNextBackMarker(storeOpts)

      expect(result).toEqual(true)
    })

    test('tries to get next marker', async () => {
      const getNextBackMarker = jest.spyOn<any, any>(markerStore, 'getNextBackMarker')
      jest.spyOn<any, any>(markerStore, 'getMarker').mockReturnValueOnce({ from: true })
      jest.spyOn<any, any>(markerStore, 'findInRange').mockReturnValueOnce({ from: true })

      const result = await markerStore.getNextBackMarker(storeOpts)

      expect(getNextBackMarker).toHaveBeenCalledTimes(2)
    })
  })

  describe('getNextForwardMarker', () => {
    test('returns target if not found in range', async () => {
      jest.spyOn<any, any>(markerStore, 'findInRange').mockReturnValueOnce(null)

      const result = await markerStore.getNextForwardMarker(storeOpts, null)

      expect(result).toEqual(null)
    })

    test('tries to get next marker', async () => {
      const getNextForwardMarker = jest.spyOn<any, any>(markerStore, 'getNextForwardMarker')
      jest.spyOn<any, any>(markerStore, 'findInRange').mockReturnValueOnce({ to: true })

      await markerStore.getNextForwardMarker(storeOpts, null)

      expect(getNextForwardMarker).toHaveBeenCalledTimes(2)
    })
  })

  test('saves a new marker', async () => {
    const makeMarker = jest.spyOn<any, any>(markerStore, 'makeMarker')
    const setMarker = jest.spyOn<any, any>(markerStore, 'setMarker').mockReturnValue(null)

    await markerStore.saveMarker(storeOpts, null, null, [{ timestamp: 0 }] as any)

    expect(makeMarker).toHaveBeenCalledTimes(1)
    expect(setMarker).toHaveBeenCalledTimes(1)
  })
})
