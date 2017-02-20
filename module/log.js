'use strict'
const moment = require('moment')

function log (statusCode) {
	return function (res, obj = {}) {
		res.end(JSON.stringify(Object.assign({code: statusCode}, obj)))
	}
}




module.exports.success = log(0)
module.exports.warning = log(1)
module.exports.error = function (res, obj) {
	res.end(JSON.stringify(Object.assign({code: -1}, obj)))

	/**
	 * 
	 * 记录错误信息
	*/
	console.log('')
	console.log('------  error log ------')
	console.log(`------  time: ${moment(Date.now()).format('YYYY-MM-DD HH:hh')}  ------`)
	console.log('')
	console.log(obj)
	console.log('')
	console.log('')
	for (let key in obj) {
		console.log('')
		console.log('key:')
		console.log(key)
		console.log('values:')
		console.log(obj[key])
	}
}