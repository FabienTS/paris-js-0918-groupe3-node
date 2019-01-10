/**** imports *****/
const express = require("express");
const connection = require("../config");
const getToken = require("../helpers/getToken");
const jwt = require("jsonwebtoken");
const jwtSecret = require("../secure/jwtSecret");

const router = express.Router();

router
  .route("/")
  /**
   * Sends candidate information from the id in Token
   */
  .get((req, res) => {
    const token = getToken(req);
    jwt.verify(token, jwtSecret, (err, decode) => {
  
      
      if (!err) {
        const sql = `
        SELECT email, phone
        FROM candidates
        WHERE is_active
        AND id=?`;
        connection.query(sql, decode.id, (err, results) => {
          if (err) {
            res.status(500).send(`Erreur serveur : ${err}`);
          } else {
            res.send(results);
          }
        });
      } else {
        res.sendStatus(403);
      }
    });
  })

  .put((req, res) => {
    const token = getToken(req);
    jwt.verify(token, jwtSecret, (err, decode) => {
      
      if (!err) {
        const dataForm = req.body;
        const sql = `
    UPDATE candidates 
    SET ?
    WHERE id = ?`;
        connection.query(
          sql,
          [dataForm, decode.id],
          (err, results) => {
            if (err) {
              res.status(500).send(`Erreur serveur : ${err}`);
            } else {
              res.send(results);
            }
          }
        );
      } else {
        res.sendStatus(403);
      }
    });
  });

module.exports = router;