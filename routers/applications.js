/**** imports *****/
const express = require("express");
const connection = require("../config");
const router = express.Router();
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const jwtSecret = require("../secure/jwtSecret");
const getToken = require("../helpers/getToken");
const password = process.env.GMAIL_PASS;
require("dotenv").config();

/**
 * Allows to post answers for questions of an offer
 *
 * !!!!! AJOUTER UPLOAD DE FICHIERS !!!!!
 */
router.post("/answer", (req, res) => {
  const token = getToken(req);
  jwt.verify(token, jwtSecret, (err, decode) => {
    if (!err) {
      const dataForm = {
        ...req.body,
        id_candidates: decode.id,
        id: null,
        created_at: new Date(),
        updated_at: new Date()
      };
      const sql = `INSERT INTO answers SET ?`;
      connection.query(sql, dataForm, (err, results) => {
        if (err) {
          res.status(500).send(`Erreur serveur : ${err}`);
        } else {
          res.json(results);
        }
      });
    } else {
      res.sendStatus(403);
    }
  });
});

router.route("/send").put((req, res) => {
  const token = getToken(req);
  const { id_candidates, id_offers } = req.body;
  const dataForm = {
    is_sent: 1
  };
  jwt.verify(token, jwtSecret, (err, decode) => {
    if (
      !err &&
      decode.id === Number(id_candidates) &&
      decode.role === "candidates"
    ) {
      const sql = `UPDATE applications SET ? WHERE id_candidates = ? AND id_offers = ?`;
      connection.query(
        sql,
        [dataForm, id_candidates, id_offers],
        (err, results) => {
          if (err) res.sendStatus(500);
          else res.status(201).send(results);
        }
      );
    } else {
      res.sendStatus(403);
    }
  });
});

/// Allows the company to change status for an application ///

router.route("/status").put((req, res) => {
  const token = getToken(req);
  const { id_candidates, id_offers, status } = req.body;
  if (status !== "validated" && status !== "rejected") {
    res
      .status(400)
      .send('ERR : Status not valid please choose "validated" or "rejected"');
  } else {
    const dataForm = {
      status
    };
    // Check company token
    jwt.verify(token, jwtSecret, (err, decode) => {
      if (err) res.sendStatus(403);
      else {
        const sqlGetIDComp = `SELECT id_companies FROM offers WHERE id= ?`;
        connection.query(sqlGetIDComp, id_offers, (err, results) => {
          if (err) res.sendStatus(500);
          else {
            // Checks if token id corresponds to the company the offers belongs to
            if (results[0].id_companies === decode.id) {
              const sql = `UPDATE applications SET ? WHERE id_candidates = ? AND id_offers = ?`;
              connection.query(
                sql,
                [dataForm, id_candidates, id_offers],
                (err, results) => {
                  if (err) res.sendStatus(500);
                  else {
                    // Allows the company to get the candidate info when application is validated //
                    if (status === "validated") {
                      const sqlGetInfo = `SELECT email, phone FROM candidates WHERE id_candidates =?`;
                      connection.query(
                        sqlGetInfo,
                        id_candidates,
                        (err, results) => {
                          if (err) {
                            res.sendStatus(500);
                          } else {
                            let smtpTransporter = nodemailer.createTransport({
                              service: `gmail`,
                              host: "smtp.gmail.com",
                              auth: {
                                user: `jemyplu@gmail.com`,
                                pass: password
                              }
                            });

                            let mailOptions = {
                              from: "jeremy <jemyplu@gmail.com>", // sender address
                              to: "supergrandma@yopmail.com", // list of receivers
                              subject: "Coucou", // Subject line
                              html: "<p>Aboule la recette mère grand</p>" // plain text body
                            };
                            smtpTransporter.sendMail(
                              mailOptions,
                              (error, response) => {
                                if (error) {
                                  return console.log(error);
                                }
                                console.log("message envoyé");

                                res.send(response);
                              }
                            );
                            res.status(201).send(results);
                          }
                        }
                      );
                    } else {
                      res.sendStatus(201);
                    }
                  }
                }
              );
            } else {
              res.sendStatus(403);
            }
          }
        });
      }
    });
  }
});

module.exports = router;
