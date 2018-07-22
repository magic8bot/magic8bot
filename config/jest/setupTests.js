global.afterEach(async () => {
  const { db } = global

  const collections = ['trades', 'sessions', 'options', 'markers', 'orders']
  await Promise.all(collections.map(async (collection) => await db.collection(collection).remove()))
})
