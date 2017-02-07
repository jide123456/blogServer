const
	Cache = require('../module/cache')(),
	db = require('../module/db')





// get all classes
module.exports.get = (req, res) => {
	res.end(JSON.stringify({
		code: 0,
		category: Cache.find('category')
	}))
}




// update one classes by id
module.exports.post = (req, res) => {
	const
		id = Number(req.params.id),
		insertData = req.body

	db.DB.collection('classes').findOneAndUpdate(
		{ id: Number(req.params.id) },
		{ $set: insertData },
		{ returnOriginal: false },
		( err, result ) => {
			if (err) {
				res.end(JSON.stringify({
					code: -1,
					err: err
				}))
				return
			}

			if (result.lastErrorObject.n) {
				Cache.reload()

				res.end(JSON.stringify({
					code: 0,
					result: result.value
				}))
			}
		}
	)
}




// create new classes
module.exports.put = (req, res) => {
	const insertData = {
		name: req.body.name,
		articles: []
	}

	db.insert('classes', insertData).then(result => {
		const
			ok = result.result.n,
			data = result.ops[0]

		if (ok) {
			Cache.reload()

			res.end(JSON.stringify({
				code: 0,
				result: data
			}))
		}
	}).then(err => {
		res.end(JSON.stringify({
			code: -1,
			err: err,
			errorMsg: 'insertOne error'
		}))
	})
}
