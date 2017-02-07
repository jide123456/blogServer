'use strict'


const
	co = require('co'),
	db = require('./db')

let instance




class Cache {
	constructor (collection = ['articles', 'category']) {
		this.collection = collection
		this.store = {}
		this.reload()
	}


	reload () {
		const
			that = this,
			temp = {}

		temp.category = db.find('category')
		temp.articles = db.find('articles', {}, [{key: 'sort', value: {id: -1}}])

		co(function *(){
			let { articles, category } = yield temp

			category = that.toObject(category)
			
			// To convert the references to instances
			articles = that.toObject(that.convert(articles, 'category', category))

			that.save('category', category)
			that.save('articles', articles)
		})
	}


	save (name, data) {
		this['store'][name] = data
	} 


	find (name) {
		return this.toArray(this['store'][name])
	}


	findOne (name, id) {
		return this['store'][name][id]
	}


	log () {
		console.log(this['store'])
	}


	// To convert the references to instances
	convert (self, field, mirror) {
		let temp = this.clone(self)

		if (temp instanceof Array) {
			temp.forEach((element) => {
				element[field] = mirror[element[field]]
			})
		} else {
			temp[field] = mirror[element[field]]
		}

		return temp
	}


	clone (copy) {
		if (typeof copy === 'object' && copy) {
			return copy instanceof Array
				? copy.slice(0)
				: Object.assign({}, copy)
		}

		return copy
	}


	toObject (array, name='id') {
		let map = {}

		array.forEach((element, index) => {
			map[element[name]] = element

			map[element[name]]['_index'] = index
		})

		return map
	}


	toArray (object) {
		let array = [], key

		for (key in object) {
			let cur = object[key]

			array[cur['_index']] = cur
		}

		return array
	}
}




module.exports = () => {
	if (instance) {
		return instance
	} else {
		instance = new Cache()
		return instance
	}
}
