require('./config/config')
const express = require('express')
const app = express()
const path = require('path')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const session = require('express-session')
const jwt = require('jsonwebtoken');


if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
}


const dirPublic = path.join(__dirname, '../public')
const dirNode_modules = path.join(__dirname, '../node_modules')
app.use(express.static(dirPublic))
app.use('/js', express.static(dirNode_modules + '/popper.js'))
app.use('/js', express.static(dirNode_modules + '/jquery'))


app.use((req, res, next) => {
    let token = localStorage.getItem('token')
    jwt.verify(token, 'secretoken', function(err, decoded) {
        if (err) {
            console.log(err)
            return next()
        }
        res.locals.sesion = true
        res.locals.nombre = decoded.data.nombre
        res.locals.rol = decoded.data.rol
        req.usuario = decoded.data._id
        next()
    });

})

app.use(bodyParser.urlencoded({ extended: false }))

app.use(require('./routes/index'))

mongoose.connect(process.env.URI, { useNewUrlParser: true }, (err, result) => {
    if (err) return console.log(err)
    return console.log('Conectado a Mongo')
});

//Puerto a abrir
const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log('conexión con el puerto ' + port)
})