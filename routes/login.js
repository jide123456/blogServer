const 
	db = require('../module/db')
	log = require('../module/log')




module.exports.auth = (req, res) => {
	db.find('users', req.body).then(data => {
		if (data.length === 0) {
			log.warning(res, {msg: '错误的账号或密码'})
		} else {
			req.session.user = data[0].user
			log.success(res, {user: data[0].user})
		}
	}).then(err => {
		log.error(res, {err: err})
	})
}

module.exports.getUser = (req, res) => {
	log.success(res, {user: req.session.user || null})
}

module.exports.logout = (req, res) => {
	req.session.user = null
	log.success(res)
}
