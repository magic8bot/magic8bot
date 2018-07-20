import { MarkerStore } from './marker.store'

jest.mock('crypto', () => {
  return {
    randomBytes: () => ({ toString: () => 'random-string' }),
  }
})
jest.mock('@lib', () => {
  return {
    dbDriver: {
      marker: {
        find: () => null,
        findOne: () => null,
        save: () => null,
      },
    },
  }
})

describe('Market store', () => {
  let markerStore: MarkerStore

  beforeEach(() => {
    markerStore = new MarkerStore()
  })

  it('should make new markers', () => {
    const newMarker = markerStore.newMarker('test')

    expect(newMarker._id).toEqual('random-string')
    expect(newMarker.selector).toEqual('test')
    expect(newMarker.to).toBeNull()
    expect(newMarker.from).toBeNull()
    expect(newMarker.oldest_time).toBeNull()
    expect(newMarker.newest_time).toBeNull()
  })

  it('should recall latest marker for a selector', () => {
    markerStore.newMarker('test')
    const newMarker = markerStore.getMarker('test')

    expect(newMarker._id).toEqual('random-string')
    expect(newMarker.selector).toEqual('test')
    expect(newMarker.to).toBeNull()
    expect(newMarker.from).toBeNull()
    expect(newMarker.oldest_time).toBeNull()
    expect(newMarker.newest_time).toBeNull()
  })

  it('should set a marker for a selector', () => {
    const newMarker = {
      _id: 'test_id',
      from: 0,
      newest_time: 100,
      oldest_time: 0,
      selector: 'test',
      to: 100,
    }
    markerStore.setMarker('test', newMarker)

    const setMarker = markerStore.getMarker('test')
    expect(setMarker).toBeTruthy()

    Object.keys(newMarker).forEach((key) => expect(setMarker[key]).toEqual(newMarker[key]))
  })

  it('should store multiple selectors', () => {
    markerStore.newMarker('test')
    markerStore.newMarker('test-2')

    const marker1 = markerStore.getMarker('test')
    expect(marker1).toBeTruthy()
    const marker2 = markerStore.getMarker('test-2')
    expect(marker2).toBeTruthy()
  })

  it('should not leak between tests', () => {
    const marker = markerStore.getMarker('test')
  })
})
