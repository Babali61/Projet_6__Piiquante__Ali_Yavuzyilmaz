
const Sauce = require('../modeles/sauce')

const fs = require('fs');

exports.createThing = (req, res, next) => {

  const sauceObject = JSON.parse(req.body.sauce);
  delete sauceObject._id;
  delete sauceObject._userId;
  const sauce = new Sauce({
    ...sauceObject,
    likes: 0,
    dislikes: 0,
    usersLiked: [],
    usersDisliked: [],
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  });

  sauce.save()
    .then(() => { res.status(201).json({ message: 'Objet enregistré !' }) })
    .catch(error => { res.status(400).json({ error }) })

}

exports.modifyThing = (req, res, next) => {
  const sauceObject = req.file ? {
    ...JSON.parse(req.body.sauce),
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  } : { ...req.body };

  delete sauceObject._userId;
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      if(sauce===null) {
        res.status(404).json({ message: 'Not found' });
      } else if (sauce.userId != req.auth.userId) {
        res.status(403).json({ message: 'Forbidden' });
      } else {
        Sauce.updateOne({ _id: req.params.id }, { ...sauceObject, _id: req.params.id })
          .then(() => res.status(200).json({ message: 'Objet modifié!' }))
          .catch(error => res.status(500).json({ error }));
      }
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
}

exports.deleteThing = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then(sauce => {
      if(sauce===null) {
        res.status(404).json({ message: 'Not found' });
      } else if (sauce.userId != req.auth.userId){
        res.status(403).json({message : 'Utilisateur non autorisé'})
      }
      else {
        const filename = sauce.imageUrl.split('/images/')[1];
        fs.unlink(`images/${filename}`, ()=>{
          Sauce.deleteOne({_id: req.params.id})
            .then(() => { res.status(204).json({message: 'Objet supprimé !'})})
            .catch(error => res.status(500).json({ error }));
        })

      }
    })
    .catch(error => {
      res.status(500).json({ error });
    })
}

exports.getOneThing = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then(sauce => {
      if(sauce===null) {
        res.status(404).json({ message: 'Not found' });
      } else {
        res.status(200).json(sauce)
      }
    })
    .catch(error => res.status(500).json({ error }));
}

exports.getAllThings = (req, res, next) => {
  Sauce.find()
    .then(sauces => res.status(200).json(sauces))
    .catch(error => res.status(500).json({ error }));
}



exports.addLike = (req, res) => {
  const sauceId = req.params.id
  const userId = req.body.userId;
  let like = req.body.like;

  Sauce.findOne({ _id: sauceId })
    .then((sauce) => {
      if (like === 0) {
        // annuler like ou dislike
        if (sauce.usersLiked.includes(userId)) {
          return Sauce.updateOne({ _id: sauceId }, { $inc: { likes: -1 }, $pull: { usersLiked: userId } });
        } else if (sauce.usersDisliked.includes(userId)) {
          return Sauce.updateOne({ _id: sauceId }, { $inc: { dislikes: -1 }, $pull: { usersDisliked: userId } });
        }
      } else if (like === 1) {
        // ajouter like
        if (!sauce.usersLiked.includes(userId)) {
          if (sauce.usersDisliked.includes(userId)) {
            return Sauce.updateOne({ _id: sauceId }, { $inc: { dislikes: -1 }, $pull: { usersDisliked: userId }, $inc: { likes: 1 }, $push: { usersLiked: userId } });
          } else {
            return Sauce.updateOne({ _id: sauceId }, { $inc: { likes: 1 }, $push: { usersLiked: userId } });
          }
        }
      } else if (like === -1) {
        // ajouter dislike
        if (!sauce.usersDisliked.includes(userId)) {
          if (sauce.usersLiked.includes(userId)) {
            return Sauce.updateOne({ _id: sauceId }, { $inc: { likes: -1 }, $pull: { usersLiked: userId }, $inc: { dislikes: 1 }, $push: { usersDisliked: userId } });
          } else {
            return Sauce.updateOne({ _id: sauceId }, { $inc: { dislikes: 1 }, $push: { usersDisliked: userId } });
          }
        }
      }
    })
    .then(() => res.status(204).json({ message: "like/dislike ajouté/modifié !" }))
    .catch((error) => res.status(400).json({ error }));
};

