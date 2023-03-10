const { Router } = require('express')
const router = new Router()

const mongoose = require('mongoose') 

const secured = require('../middleware/route-guard')
const Video = require('../models/Video.model.js')
const User = require('../models/User.model.js')




router.get('/watch/:id', (req, res, next) => {
  let Id = req.params.id

  let currentUserInfo = { name: { givenName: '' } }
  if (req.user === undefined) {
    currentUserInfo.name.givenName = 'Guest'
  } else {
    const { _raw, _json, ...currentUserProfile } = req.user
    currentUserInfo = currentUserProfile
  }

  Video.findById(Id)
    .then((videoInfo) => {

      res.render('videos/single-video', {
        title: videoInfo.title,
        currentUserProfile: currentUserInfo,
        video: videoInfo,
      })
    })
    .catch((err) => {
      console.log(err)
      next(err)
    })
})

router.post('/search', secured, (req, res, next) => {
  let { search } = req.body
  const { _raw, _json, ...currentUserProfile } = req.user

  Video.find({ title: { $regex: search, $options: 'i' } })
    .then((videos) => {
      console.log(videos)
      res.render('videos/video-search', {
        title: search,
        currentUserProfile: currentUserProfile,
        videos: videos,
      })
    })
    .catch((err) => {
      console.log(err)
      next(err)
    })
})

router.get('/video/:authorId/fetchData', async (req, res, next) => {
  const {authorId} = req.params


  let author = await User.findById(authorId)

  if(author){
    res.status(200).json(author.channelName)
  }
})

router.post('/video/:videoId/update', (req, res, next) => {

  const {videoId} = req.params

  const {views} = req.body

  if(views){
    Video.findByIdAndUpdate(videoId, {$inc: {views: 1}}, {new:true}).then(updatedVideo => {
      res.status(200).json(`views: ${updatedVideo.views}`)
    })
  }
})

router.get('/video/:videoId/edit', secured, async (req, res, next) => {

  const {videoId} = req.params
  
  Video.findById(videoId).populate('author').then( video => {
    res.render('videos/edit-video-page', {video})
  }).catch(err => res.status(500).json(err))

})

// router.post('/video/:videoId/delete', secured, (req, res, next) => {

//   const {videoId} = req.params
//   const ownerId = req.user.id
// })

module.exports = router
