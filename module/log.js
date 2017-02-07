'use strict'


function log (statusCode) {
	return function (res, obj = {}) {
		res.end(JSON.stringify(Object.assign({code: statusCode}, obj)))
	}
}




module.exports.success = log(0)
module.exports.warning = log(1)
module.exports.error = log(-1)