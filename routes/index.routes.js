const express = require('express')
const router = express.Router()
const Video = require('../models/Video.model.js')
const mongoose = require('mongoose') // <== has to be added
const User = require('../models/User.model.js')
const Chat = require('../models/Chat.model.js')

const secured = require('../middleware/route-guard')

router.get('/', (req, res, next) => {
  res.redirect('/home')
})

/* GET home page */
router.get('/home', async (req, res, next) => {
  let currentUser
  let videos = await Video.find().populate('author')

  try {
    currentUser = await User.findOne({ authId: req.user.id })

    res.render('home', {
      title: 'Home',
      currentUser,
      videos,
    })
  } catch (error) {
    res.render('home', {
      title: 'Home',
      videos,
    })
  }
})

router.get('/trending', secured, async (req, res, next) => {
  let currentUser = await User.findOne({ authId: req.user.id })
  const trendingVideos = await Video.find({
    averageRating: { $gte: 4 },
    views: { $gte: 10 },
  })
    .populate('author')
    .sort({
      averageRating: 'desc',
      views: 'desc',
    })
  res.render('trending', {
    title: 'Trending',
    videos: trendingVideos,
    currentUser,
  })
})

router.get('/groups', async (req, res, next) => {
  let currentUser = await User.findOne({ authId: req.user.id })

  res.render('under-construction', {
    title: 'Groups',
    currentUser,
  })
})

router.get('/subscriptions', secured, async (req, res, next) => {
  let currentUser = await User.findOne({ authId: req.user.id })
  let subscriptions = []

  try {
    let subIds = await User.find({ subscribers: currentUser._id })

    for (const subId of subIds) {
      let subscription = {}
      const videos = await Video.find({ author: subId })
        .sort({ createdAt: 'desc' })
        .limit(3)
      subscription.videos = videos
      subscription.channelName = subId.channelName
      subscription.profilePic = subId.profilePic
      subscriptions.push(subscription)
    }

    if(subscriptions.length!==0){
      res.render('subscriptions', {
        title: 'subscriptions',
        currentUser,
        subscriptions,
      })

    } else{
      res.render('subscriptions', {
        title: 'subscriptions',
        currentUser,
      })
    }
  } catch (error) {
    console.log(error)
  }
})

router.get('/subscriptions/:subId', secured, async (req, res, next) => {
  const { subId } = req.params
  let currentUser = await User.findOne({ authId: req.user.id })

  let videos = await Video.find({ author: subId })

  res.status(200).json(videos)
})

router.get('/history', secured, async (req, res, next) => {
 
  let currentUser = await User.findOne({ authId: req.user.id })
  .populate({
    path: 'watchHistory',
    populate: {
      path: 'author',
      select: 'channelName profilePic',
    },
  })
  console.log(currentUser)
  res.render('history', {
    title: 'history',
    currentUser,
  })
})
router.get('/nutrition', secured, async (req, res, next) => {

  let currentUser = await User.findOne({ authId: req.user.id })

  res.render('under-construction', {
    title: 'Nutrition',
    currentUser
  })
})

router.get('/messages', secured, async (req, res, next) => {
  try {
    const currentUser = await User.findOne({ authId: req.user.id })
      .populate('chat')
      .exec();

    const chats = await Chat.find({
      $or: [
        { sender: currentUser._id },
        { recipient: currentUser._id },
      ],
    })
      .populate('sender')
      .populate('recipient')
      .exec();

    const conversations = {};
    chats.forEach((chat) => {
      const otherUser = chat.sender._id.equals(currentUser._id)
        ? chat.recipient
        : chat.sender;
      if (!conversations[otherUser._id]) {
        conversations[otherUser._id] = {
          user: otherUser,
          messages: [],
        };
      }
      conversations[otherUser._id].messages.push(chat);
    });

    const conversationList = Object.values(conversations);

    res.render('chat/loadchats', {
      title: 'messages',
      currentUser,
      conversations: conversationList,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/messages/:profileId', secured, async (req, res, next) => {
  const { profileId } = req.params

  let currentUser = await User.findOne({ authId: req.user.id })
    .populate('chat')
    .exec()
  let objID = new mongoose.Types.ObjectId(profileId)
  let otherUser = await User.findById(objID).exec()
  let chatDM = await Chat.find({
    $or: [{ sender: objID }, { recipient: objID }],
    $and: [
      { $or: [{ sender: currentUser._id }, { recipient: currentUser._id }] },
    ],
  })
    .populate('sender')
    .lean()
    .exec()
  chatDM = chatDM.map(function (item) {
    if (new mongoose.Types.ObjectId(item.sender._id).equals(currentUser._id)) {
      return {
        ...item,
        right: true,
      }
    } else {
      return {
        ...item,
        right: false,
      }
    }
  })

  chatDM.forEach(async (chat) => {
    if (currentUser._id == chat.recipient) {
      let view = await Chat.findByIdAndUpdate(chat._id, { viewed: true })
    }
  })

  res.render('chat/dmchat', {
    title: 'messages',
    currentUser,
    chatDM,
    otherUser,
  })
})

router.get('/messages/:id/new', secured, async (req, res, next) => {
  const { id } = req.params
  try {
    let currentUser = await User.findOne({ authId: req.user.id })
      .populate('chat')
      .exec()
    let objID = new mongoose.Types.ObjectId(id)
    let otherUser = await User.findById(objID).exec()
    let chatDM = await Chat.find({
      $or: [{ sender: objID }, { recipient: objID }],
      $and: [
        { $or: [{ sender: currentUser._id }, { recipient: currentUser._id }] },
      ],
    })
      .populate('sender')
      .lean()
      .exec()
    chatDM = chatDM.map(function (item) {
      if (
        new mongoose.Types.ObjectId(item.sender._id).equals(currentUser._id)
      ) {
        return {
          ...item,
          right: true,
        }
      } else {
        return {
          ...item,
          right: false,
        }
      }
    })

    chatDM.forEach(async (chat) => {
      if (new mongoose.Types.ObjectId(currentUser._id).equals(chat.recipient)) {
        let view = await Chat.findByIdAndUpdate(chat._id, { viewed: true })
      }
    })

    res.json(chatDM)
  } catch (error) {
    console.log(error)
  }
})

router.get('/notification', secured, async (req, res, next) => {
  let currentUser = await User.findOne({ authId: req.user.id })
    .populate('chat')
    .exec()
  let notification = await Chat.find({
    recipient: currentUser._id,
    viewed: false,
  })
    .populate('sender')
    .lean()
    .exec()

  res.json(notification)
})

router.post('/messages/:recipient', secured, async (req, res, next) => {
  const { text_sms } = req.body
  const { recipient } = req.params

  let currentUser = await User.findOne({ authId: req.user.id }).exec()

  let obj = {
    sender: currentUser._id,
    recipient: recipient,
    message: text_sms,
  }

  try {
    let SendSMS = await Chat.create(obj)
    let addSMSsender = await User.findByIdAndUpdate(currentUser._id, {
      $addToSet: { chat: SendSMS._id },
    })
    let addSMSrecipient = await User.findByIdAndUpdate(recipient, {
      $addToSet: { chat: SendSMS._id },
    })

    res.json(SendSMS)
  } catch (error) {
    console.log(error)
  }
})

router.post('/messages', secured, async (req, res, next) => {
  const { text_sms, recipient } = req.body
  let currentUser = await User.findOne({ authId: req.user.id }).exec()

  let obj = {
    sender: currentUser._id,
    recipient: recipient,
    message: text_sms,
  }

  try {
    let SendSMS = await Chat.create(obj)
    let addSMSsender = await User.findByIdAndUpdate(currentUser._id, {
      $addToSet: { chat: SendSMS._id },
    })
    let addSMSrecipient = await User.findByIdAndUpdate(recipient, {
      $addToSet: { chat: SendSMS._id },
    })

    res.redirect(`/messages`)
  } catch (error) {
    console.log(error)
  }
})
router.post('/user/find', secured, async (req, res, next) => {
  const { search_dm } = req.body
  let currentUser = await User.findOne({ authId: req.user.id }).exec()

  let chatWith = await User.findOne({
    username: { $regex: `${search_dm}`, $options: 'i' },
  })
  if (chatWith === null) {
    res.redirect(`/messages`)
  } else {
    res.redirect(`/messages/${chatWith._id}`)
  }
})

module.exports = router
