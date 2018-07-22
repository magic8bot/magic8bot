import { MarkerStore } from './marker.store'

describe('MarkerStore', () => {
  let markerStore: MarkerStore

  beforeEach(() => {
    markerStore = new MarkerStore()
  })

  it('should make new markers', (done) => {
    const newMarker = markerStore.newMarker('test')

    expect(newMarker._id).toEqual('random-string')
    expect(newMarker.selector).toEqual('test')
    expect(newMarker.to).toBeNull()
    expect(newMarker.from).toBeNull()
    expect(newMarker.oldest_time).toBeNull()
    expect(newMarker.newest_time).toBeNull()

    done()
  })

  it('should recall latest marker for a selector', (done) => {
    markerStore.newMarker('test')
    const newMarker = markerStore.getMarker('test')

    expect(newMarker._id).toEqual('random-string')
    expect(newMarker.selector).toEqual('test')
    expect(newMarker.to).toBeNull()
    expect(newMarker.from).toBeNull()
    expect(newMarker.oldest_time).toBeNull()
    expect(newMarker.newest_time).toBeNull()

    done()
  })

  it('should set a marker for a selector', (done) => {
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

    done()
  })

  it('should store multiple selectors', (done) => {
    markerStore.newMarker('test')
    markerStore.newMarker('test-2')

    const marker1 = markerStore.getMarker('test')
    expect(marker1).toBeTruthy()
    const marker2 = markerStore.getMarker('test-2')
    expect(marker2).toBeTruthy()

    done()
  })

  it('should not leak between tests', (done) => {
    const marker = markerStore.getMarker('test')
    expect(marker).toBeFalsy()

    done()
  })
})
