const
	Cache = require('../module/cache')(),
	db = require('../module/db')
	log = require('../module/log')





// get all category
module.exports.get = (req, res) => {
	log.success(res, {category: Cache.find('category')})
}




// update one category by id
module.exports.post = (req, res) => {
	const
		id = Number(req.params.id),
		insertData = req.body

	db.DB.collection('category').findOneAndUpdate(
		{ id: Number(req.params.id) },
		{ $set: insertData },
		{ returnOriginal: false },
		( err, result ) => {
			if (err) {
				log.error(res, {err: err})
				return
			}

			if (result.lastErrorObject.n) {
				Cache.reload()

				log.success(res, {result: result.value})
			}
		}
	)
}




// create new category
module.exports.put = (req, res) => {
	const insertData = {
		name: req.body.name,
		articles: []
	}

	db.insert('category', insertData).then(result => {
		const
			ok = result.result.n,
			data = result.ops[0]

		if (ok) {
			Cache.reload()

			log.success(res, {result: data})
		}
	}).then(err => {
		log.error(res, {err: err})
	})
}
