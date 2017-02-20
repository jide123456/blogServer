// initialize
require('../module/cache')()



const 
	express = require('express'),
	articles = require('./articles'),
	category = require('./category'),
	login = require('./login'),
	
	resourceRouter = express.Router(),
	apiRouter = express.Router()




resourceRouter.use((req, res, next) => {
	let method = req.method,
		user = req.session.user

	// verify permissions
	if (process.env.NODE_ENV === 'production') {
		if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
			if (!user) {
				res.end(JSON.stringify({
					code: 40001,
					msg: 'limited authority'
				}), 'utf8')

				return
			} else {
				next()
			}
		} else {
			next()
		}
	} else {
		next()
	}

})

// /resource/article
resourceRouter.get('/article', articles.get)
resourceRouter.put('/article', articles.put)

// /resource/article/:id
resourceRouter.get('/article/:id', articles.getOne)
resourceRouter.post('/article/:id', articles.post)
resourceRouter.delete('/article/:id', articles.delete)

// /resource/category
resourceRouter.get('/category', category.get)
resourceRouter.put('/category', category.put)

// /resource/category/:id
resourceRouter.post('/category/:id', category.post)

resourceRouter.get('/user', login.getUser)


// /api/login
apiRouter.post('/login', login.auth)
apiRouter.get('/logout', login.logout)

module.exports = {
	resource: resourceRouter,
	api: apiRouter
}
