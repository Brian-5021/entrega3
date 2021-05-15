const express = require('express')
const app = express()
const path = require('path')
const hbs = require('hbs')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');

//Schemas y modelos 
const Usuario = require('../models/usuario')
const Curso = require('../models/curso')
const Inscripcion = require('../models/inscripcion')

//Directorios
const dirPartials = path.join(__dirname, '../../template/partials')
const dirViews = path.join(__dirname, '../../template/views')

//Helpers Views Partials
require('../helpers/helpers')
app.set('views', dirViews)
app.set('view engine', 'hbs')
hbs.registerPartials(dirPartials)

//ENDPOINT
app.get('/', (req, res) => {
        res.render('index')
    })
    //Cursos
app.get('/crearCurso', (req, res) => {
    res.render('crearCurso')
})
app.get('/cursos', (req, res) => {
    Curso.find({}).exec((err, results) => {
        if (err) return res.render('mensaje', { mensaje: err })
        res.render('cursos', {
            listado: results
        })
    })
})
app.post('/crearCurso', (req, res) => {
    let { id, nombre, intensidad, valor, descripcion, modalidad } = req.body
    Curso.findOne({ id: id }, (err, result) => {
        if (err) res.render('mensaje', { mensaje: err })
        if (result) {
            res.render('mensaje', {
                mensaje: '<div class="alert alert-danger">\
                        <strong>ERROR!</strong> ID de Curso repetido.\
                        </div>'
            })
        }
    })
    let curso = new Curso({
        id: id,
        nombre: nombre,
        intensidad: intensidad,
        valor: valor,
        descripcion: descripcion,
        modalidad: modalidad,
    });
    curso.save((err, result) => {
        if (err) res.render('mensaje', { mensaje: err })
        if (result) {
            res.render('mensaje', {
                mensaje: 'Curso <b>' + result.nombre + '</b> creado!'
            })
        }
    })
})
app.post('/actualizarCurso', (req, res) => {
    let { id } = req.body
    Curso.findOne({ id: id }, (err, result) => {
        let newEstado
        if (err) res.render('mensaje', { mensaje: err, })
        if (result) {
            if (result.estado == "cerrado") newEstado = "disponible"
            else newEstado = "cerrado"
        }
        Curso.findOneAndUpdate({ id: id }, { estado: newEstado }, { new: true, runValidators: true, context: 'query' }, (err, result) => {
            if (err) {
                res.render('mensaje', {
                    mensaje: err,
                })
            }
            if (result) {
                res.render('mensaje', {
                    mensaje: 'Curso <b>' + result.nombre + '</b> actualizado!',
                })
            }
        });
    })
})

//Inscripciones
app.get('/inscribir', (req, res) => {
    Curso.find({}).exec((err, results) => {
        if (err) return res.render('mensaje', { mensaje: err })
        Usuario.findById(req.usuario, (err, result) => {
            if (err) res.render('mensaje', { mensaje: err })
            res.render('inscribir', {
                listado: results,
                documento: result.documento,
                telefono: result.telefono,
                email: result.email
            })
        })
    })

})
app.post('/inscribir', (req, res) => {
    let { documento, id, nombre } = req.body
    let _id = documento + '|' + id
    Inscripcion.findOne({ _id: _id }, (err, result) => {
        if (err) res.render('mensaje', { mensaje: err })
        if (result) {
            res.render('mensaje', {
                mensaje: '<div class="alert alert-danger">\
                        <strong>ERROR!</strong>Ya se encuentra inscrito en este Curso.\
                        </div>'
            })
        }
    })
    Curso.findOne({ id: id }, (err, result) => {
        if (err) res.render('mensaje', { mensaje: err })
        let curso
        if (result) curso = result.nombre
        let inscripcion = new Inscripcion({
            _id: _id,
            documento: documento,
            estudiante: nombre,
            id: result.id,
            curso: curso,
        });
        inscripcion.save((err, result) => {
            if (err) res.render('mensaje', { mensaje: err })
            if (result) {
                res.render('mensaje', {
                    mensaje: 'Estudiante <b>' + result.estudiante + '</b> inscrito en <b>' + result.curso + '</b>!'
                })
            }
        })
    })
})
app.get('/inscritos', (req, res) => {
    Inscripcion.find({}).exec((err, inscritos) => {
        if (err) return res.render('mensaje', { mensaje: err })
        Curso.find({}, (err, cursos) => {
            if (err) return res.render('mensaje', { mensaje: err })
            console.log(cursos, inscritos)
            res.render('inscritos', {
                cursos: cursos,
                inscritos: inscritos
            })
        })
    })
})
app.post('/eliminarInscrito', (req, res) => {
    let { curso, estudiante } = req.body
    let _id = estudiante + '|' + curso
    Inscripcion.deleteOne({ _id: _id }, (err, result) => {
        if (err) return res.render('mensaje', { mensaje: err })
        res.redirect('/inscritos')
    })
})

//Usuario 
app.get('/registrar', (req, res) => {
    res.render('registrar')
})
app.post('/registrar', (req, res) => {
    let { documento, nombre, password, rol, telefono, email } = req.body
    let usuario = new Usuario({
        documento,
        documento,
        nombre: nombre,
        password: bcrypt.hashSync(password, 10),
        rol: rol,
        telefono: telefono,
        email: email,
    })
    usuario.save((err, result) => {
        if (err) {
            if (err.name == 'ValidationError') {
                res.render('mensaje', {
                    mensaje: '<div class="alert alert-danger">\
                        <strong>ERROR!</strong> Documento o Nombre de usuario repetido.</div>'
                })
            }
            res.render('mensaje', { mensaje: err })
        } else {
            res.render('mensaje', {
                mensaje: 'Usuario <b>' + result.nombre + '</b> registrado en el sistema'
            })
        }
    })
})
app.post('/ingresar', (req, res) => {
    let { nombre, password } = req.body
    Usuario.findOne({ nombre: nombre }, (err, result) => {
        if (err) return res.render('mensaje', { mensaje: err })
        if (!result) {
            return res.render('mensaje', {
                mensaje: "Usuario No encontrado",
            })
        }
        if (!bcrypt.compareSync(password, result.password)) {
            return res.render('mensaje', {
                mensaje: "Contraseña incorrecta",
            })
        }
        let token = jwt.sign({
            data: result
        }, 'secretoken', { expiresIn: '1h' });
        localStorage.setItem('token', token);
        res.redirect('/ingresar/' + result._id)
    })
})
app.get('/ingresar/:_id', (req, res) => {
    let _id = req.params._id
    Usuario.findById(_id, (err, result) => {
        if (err) res.render('mensaje', { mensaje: err })
        else {
            res.render('mensaje', {
                mensaje: "<p>Bienvenido al sistema <b>" + result.nombre + "</b></p> ",
            })
        }
    })
})
app.get('/salir', (req, res) => {
    localStorage.setItem('token', '')
    res.redirect('/')
})

//Culquier otra cosa
app.get('*', (req, res) => {
    res.render('error')
})

module.exports = app