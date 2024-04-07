const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const router = express.Router();

const keys = require('../../config/keys');
const verify = require('../../utilities/verify-token');
const Message = require('../../models/Message');
const Conversation = require('../../models/Conversation');
const GlobalMessage = require('../../models/GlobalMessage');

let jwtUser = null;

// Token verfication middleware
router.use(function(req, res, next) {
    try {
        jwtUser = jwt.verify(verify(req), keys.secretOrKey);
        next();
    } catch (err) {
        console.log(err);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Unauthorized' }));
        res.sendStatus(401);
    }
});

// Get global messages
router.get('/global', (req, res) => {
    GlobalMessage.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'from',
                foreignField: '_id',
                as: 'fromObj',
            },
        },
    ])
        .project({
            'fromObj.password': 0,
            'fromObj.__v': 0,
            'fromObj.date': 0,
        })
        .then((messages) => {
            res.send(messages);
        }).catch((err)=>{
            console.log(err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Failure' }));
            res.sendStatus(500);
        });
});

// Post global message
router.post('/global', (req, res) => {
    let message = new GlobalMessage({
        from: jwtUser.id,
        body: req.body.body,
    });

    req.io.sockets.emit('messages', req.body.body);

    message.save().then(() => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Success' }));
    }).catch((err)=>{
            console.log(err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Failure' }));
            res.sendStatus(500);
    });
});

// Get conversations list
router.get('/conversations', (req, res) => {
    let from = new mongoose.Types.ObjectId(jwtUser.id);
    Conversation.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'recipients',
                foreignField: '_id',
                as: 'recipientObj',
            },
        },
    ])
        .match({ recipients: { $all: [{ $elemMatch: { $eq: from } }] } })
        .project({
            'recipientObj.password': 0,
            'recipientObj.__v': 0,
            'recipientObj.date': 0,
        })
        .then((conversations) => {
            res.send(conversations);
        }).catch((err)=>{
            console.log(err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Failure' }));
            res.sendStatus(500);
        });
});

// Get messages from conversation
// based on to & from
router.get('/conversations/query', (req, res) => {
    let user1 = new mongoose.Types.ObjectId(jwtUser.id);
    let user2 = new mongoose.Types.ObjectId(req.query.userId);
    Message.aggregate([
        {
            $lookup: {
                from: 'users',
                localField: 'to',
                foreignField: '_id',
                as: 'toObj',
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'from',
                foreignField: '_id',
                as: 'fromObj',
            },
        },
    ])
        .match({
            $or: [
                { $and: [{ to: user1 }, { from: user2 }] },
                { $and: [{ to: user2 }, { from: user1 }] },
            ],
        })
        .project({
            'toObj.password': 0,
            'toObj.__v': 0,
            'toObj.date': 0,
            'fromObj.password': 0,
            'fromObj.__v': 0,
            'fromObj.date': 0,
        })
        .then((messages) => {
            res.send(messages);
        }).catch((err)=>{
            console.log(err);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Failure' }));
            res.sendStatus(500);
        });
});

// Post private message
router.post('/', (req, res) => {
    let from = new mongoose.Types.ObjectId(jwtUser.id);
    let to = new mongoose.Types.ObjectId(req.body.to);

    Conversation.findOneAndUpdate(
        {
            recipients: {
                $all: [
                    { $elemMatch: { $eq: from } },
                    { $elemMatch: { $eq: to } },
                ],
            },
        },
        {
            recipients: [jwtUser.id, req.body.to],
            lastMessage: req.body.body,
            date: Date.now(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).then((conversation)=> {
        let message = new Message({
            conversation: conversation._id,
            to: req.body.to,
            from: jwtUser.id,
            body: req.body.body,
        });

        req.io.sockets.emit('messages', req.body.body);

        message.save().then(() => {
            res.setHeader('Content-Type', 'application/json');
            res.end(
                JSON.stringify({
                    message: 'Success',
                    conversationId: conversation._id,
                })
            );
        }).catch((err)=>{
                console.log(err);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ message: 'Failure' }));
                res.sendStatus(500);
        });
    }).catch((err)=>{
        console.log(err);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Failure' }));
        res.sendStatus(500);
    });

});

module.exports = router;
