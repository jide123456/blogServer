const
    fs = require('fs'),
    path = require('path'),
    marked = require('marked'),
    moment = require('moment'),
    co = require('co'),
    pinyin = require('pinyin'),
    UpYun = require('upyun'),
    
    highlightAuto = require('../module/highlight').highlightAuto,
    Cache = require('../module/cache')(),
    db = require('../module/db'),
    log = require('../module/log')

const imgLocalPath = '/upload/articles/'




// set marked
const renderer = new marked.Renderer()

marked.setOptions({highlight: code => highlightAuto(code).value})
renderer.heading = (text, level) => {
	const _pinyin = pinyin(text, {style: pinyin.STYLE_TONE2}).join('')
	return `<h${level} id="${_pinyin}" class="j-heading">${text}</h${level}>` 
}



// set upyun
let config, upyun

try {
	config = require('../config')
	upyun = new UpYun(config.upyun.bucket, config.upyun.user, config.upyun.pwd, 'v0.api.upyun.com', {
		apiVersion: 'v2',
		secret: 'yoursecret'
	})
} catch (err) {}




// save img 
function saveImg (imgObj) {
	const img = path.resolve(__dirname, '../public/upload/articles/', imgObj.name)
	const base64 = imgObj.base64.replace(/^data:image\/\w+;base64,/, '')

	return new Promise((resolve, reject) => {
		fs.writeFile(img, new Buffer(base64, 'base64'), err => {
			err && reject({type: 'saveImg error', err: err})

			if (process.env.NODE_ENV === 'production') {
				upyun.putFile(config.upyun.remotePath + imgObj.name, img, null, true, {}, (err, result) => {
					err
						? reject(err)
						: result.statusCode === 200
							? resolve(result)
							: reject({type: 'saveImg error', msg: 'saveImg error to cdn'})
				})
			} else {
				resolve()
			}
		})
	})
}




// get all articles
module.exports.get = (req, res) => {
	let cache = Cache.find('articles'),
		filter = req.query.filter || 'all',
		temp = []

	if (filter == 'all') {
		temp = cache
	} else {
		cache.forEach((element, index) => {
			element.category.name == filter && temp.push(element)
		})
	}

	log.success(res, {articles: temp})
}




// get one article by id
module.exports.getOne = (req, res) => {
	let id = req.params.id

	log.success(res, {article: Cache.findOne('articles', id) || null})
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
	formData.html = marked(formData.markdown, {renderer: renderer})
	formData.lastChangeDate = moment().format('YYYY-MM-DD HH:mm')

	// check has change background image
	if (ctrl.isChangeBg === 'true') {
		let copyBg = Object.assign({}, formData.bg)

		formData.bg.localPath = imgLocalPath + formData.bg.name
		formData.bg.cdnPath = config.upyun.cdnPath + formData.bg.name
		delete formData.bg.base64

		task.push( db.update('articles', {id: id}, {$set: formData}) )
		task.push( saveImg(copyBg) )
	} else {
		delete formData.bg
		task.push( db.update('articles', {id: id}, {$set: formData}) )
	}

	// check has change category
	if (ctrl.isChangeCategory === 'true') {
		task.push(db.update('category', {id: Number(formData.category)}, {$push: {articles: id}}))
		task.push(db.update('category', {id: Number(ctrl.oldCategory)}, {$pull: {articles: id}}))
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
	formData.html = marked(formData.markdown, {renderer: renderer})
	formData.date = moment().format('YYYY-MM-DD HH:mm')
	formData.lastChangeDate = moment().format('YYYY-MM-DD HH:mm')

	// check background image
	if (formData.bg) {
		task.push(saveImg(Object.assign({}, formData.bg)))

		formData.bg.localPath = imgLocalPath + formData.bg.name
		formData.bg.cdnPath = config.upyun.cdnPath + formData.bg.name
		delete formData.bg.base64
	}

	// save img and insert Data to DB
	task.push(db.insert('articles', formData))
	Promise.all(task).then(r => {
		const articleData = r.length === 2
			? r[1]['ops'][0]
			: r[0]['ops'][0]

		// 关联文章
		db.update('category', {id: Number(formData.category)}, {$push: {articles: Number(articleData.id)}}).then(r => {
			Cache.reload()
			log.success(res, {result: articleData})
		}, err => {
			log.error(res, {err: err})
		})
	}).catch(err => {
		log.error(res, {err: err})
	})
}





// delete one article by id
module.exports.delete = (req, res) => {
	const
		articleId = Number(req.params.id),
		caregoryId = Number(req.body.category)

	co(function *(){
		yield db.delete('articles', {id: articleId})
		yield db.update('category', {id: caregoryId}, {$pull: {articles: articleId}})

		Cache.reload()
		log.success(res)
	}).catch(err => {
		log.error(res, {err: err})
	})
}