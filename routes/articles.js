const
	fs = require('fs'),
	path = require('path')
	marked = require('marked'),
	moment = require('moment'),
	co = require('co'),
	Cache = require('../module/cache')(),
	db = require('../module/db'),
	log = require('../module/log')

const imgPath = '/upload/articles/'




// save img 
function saveImg (imgObj) {
	return new Promise((resolve, reject) => {
		fs.writeFile(
				path.resolve(__dirname, '../public/upload/articles/', imgObj.name),
				new Buffer(imgObj.ctn.replace(/^data:image\/\w+;base64,/, ''), 'base64'),
				err => {
					if (err) {reject({type: 'saveImg error', err:err})}
					else {resolve()}
				}
			)
	})
}




// get all articles
module.exports.get = (req, res) => {
	let cache = Cache.find('articles'),
		filter = req.query.filter || 'all',
		temp = []

	if (filter == 'all') {
		temp = cache
	}
	else {
		cache.forEach((element, index) => {
			element.category.name == filter && temp.push(element)
		})
	}

	res.end(JSON.stringify({
		code: 0,
		articles: temp
	}))
}




// get one article by id
module.exports.getOne = (req, res) => {
	let id = req.params.id

	res.end(JSON.stringify({
		code: 0,
		article: Cache.findOne('articles', id) || null
	}))
}




/**
 * post
 *
 * @describe		update article
 *
*/
module.exports.post = (req, res) => {
	const
		id = Number(req.params.id),
		formData = req.body.data,
		ctrl = req.body.ctrl,
		task = []

	// format data
	formData.html = marked(formData.markdown)
	formData.lastChangeDate = moment(Date.now()).format('YYYY-MM-DD HH:hh')

	// check has change background image
	if (ctrl.isChangeBg) {
		let copyBg = Object.assign({}, formData.bg)

		formData.bg.ctn = imgPath + formData.bg.name
		task.push( db.update('articles', {id: id}, {$set: formData}) )
		task.push( saveImg(copyBg) )
	} else {
		delete formData.bg
		task.push( db.update('articles', {id: id}, {$set: formData}) )
	}

	// check has change category
	if (ctrl.isChangeCategory) {
		task.push(db.update('category', {id: formData.category}, {$push: {articles: id}}))
		task.push(db.update('classes', {id: ctrl.oldCategory}, {$pull: {articles: id}}))
	}

	Promise.all(task).then(r => {
		Cache.reload()
		log.success(res)
	}).catch(err => {
		log.error(res, {err: err})
	})
}





/**
 * put
 *
 * @describe		create a new article
 *
*/
module.exports.put = (req, res) => {
	const formData = req.body
	const task = []

	// format data
	formData.html = marked(formData.markdown)
	formData.date = moment(Date.now()).format('YYYY-MM-DD HH:hh')
	formData.lastChangeDate = moment(Date.now()).format('YYYY-MM-DD HH:hh')

	// check background image
	if (formData.bg) {
		task.push(saveImg(Object.assign({}, formData.bg)))
		formData.bg.ctn = imgPath + formData.bg.name
	}

	// save img and insert Data to DB
	task.push(db.insert('articles', formData))
	Promise.all(task).then(r => {
		const articleData = r.length === 2
			? r[1]['ops'][0]
			: r[0]['ops'][0]

		// 关联文章
		db.update('classes', {id: formData.category}, {$push: {articles: articleData.id}}).then(r => {
			Cache.reload()
			log.success(res, {result: articleData})
		}).then(err => {
			log.error(res, {err: err})
		})
	}).catch(err => {
		log.error(res, {err: err})
	})
}





// delete one article by id
module.exports.delete = (req, res) => {
	let articleId = Number(req.params.id),
		classesId = JSON.parse(req.body.data).classes

	co(function *(){
		yield db.delete('articles', {id: articleId})
		yield db.update('classes', {id: classesId}, {$pull: {articles: articleId}})

		Cache.reload()

		res.end(JSON.stringify({code: 0}))
	}).catch(err => {
		res.end(JSON.stringify(err))
	})
}