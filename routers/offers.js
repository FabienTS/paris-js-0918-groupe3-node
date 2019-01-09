/**** imports *****/
const express = require("express");
const jwt = require("jsonwebtoken");

const connection = require("../config");
const getToken = require("../helpers/getToken");
const jwtSecret = require("../secure/jwtSecret");

const router = express.Router();

router
  .route("/")
  /**
   * Posts a new offer for the company,
   * then gets the id of the offer and posts the corresponding questions ids
   * in the offers_questions table.
   *
   * id_companies has to be passed from the token and questions ids as query, comma separated
   * (?questions=1,2,3,4,5,6)
   */
  .post((req, res) => {
    const token = getToken(req);
    jwt.verify(token, jwtSecret, (err, decode) => {
      if (!err) {
        // Calculates validity date
        let validUntil = new Date();
        validUntil.setMonth(validUntil.getMonth() + 2);

        // fusing datas from req.body and fix data
        fixData = {
          id: null,
          is_active: true,
          id_companies: decode.id,
          valid_until: validUntil,
          created_at: new Date(),
          updated_at: new Date()
        };
        const formData = Object.assign(fixData, req.body);
        //Inserting data in offers table
        const sqlOffer = `INSERT INTO offers SET ?`;
        connection.query(sqlOffer, formData, (err1, results) => {
          if (err1) {
            res.status(500).send(`Erreur serveur : ${err1}`);
          } else {
            //Inserting data in offers_questions table
            const offerId = results.insertId;
            const questions = req.query.questions.split(",");
            let sqlQuestionsValues = [];
            for (let i = 0; i < questions.length; i++) {
              const questionId = questions[i];
              if (/\d+/.test(questionId))
                sqlQuestionsValues.push(
                  `(${offerId}, ${connection.escape(questionId)})`
                );
            }

            const sqlQuestions = `
              INSERT INTO offers_questions (id_offers, id_questions) 
              VALUES ${sqlQuestionsValues.join(`, `)}`;
            connection.query(sqlQuestions, (err2, results2) => {
              if (err2) {
                res.status(500).send(`Erreur serveur : ${err2}`);
              } else {
                res.json(results2);
              }
            });
          }
        });
      } else {
        res.status(403).json({ token });
      }
    });
  })

  /**
   * Allows to GET offers for a company
   */
  .get((req, res) => {
    const token = getToken(req);

    jwt.verify(token, jwtSecret, (err, decode) => {
      if (!err) {
        const sql = `
          SELECT id, title, description, contract_type, is_active, is_published, id_companies, updated_at
          FROM offers 
          WHERE id_companies=? 
          AND is_active=?`;
        connection.query(
          sql,
          [decode.id, req.query.is_active],
          (err, results) => {
            if (err) {
              res.status(500).send(`Erreur serveur : ${err}`);
            } else {
              res.json(results);
            }
          }
        );
      } else {
        res.sendStatus(403);
      }
    });
  });

router
  .route("/:id_offer/applications")
  /**
   * Allows a candidate to apply to an offer
   */
  .post((req, res) => {
    const token = getToken(req);
    jwt.verify(token, jwtSecret, (err, decode) => {
      if (!err) {
        const dataForm = {
          ...req.body,
          id_candidates: decode.id,
          status: "waiting"
        };
        const sql = `INSERT INTO applications SET ?`;
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
  })

  .get((req, res) => {
    // const token = getToken(req);

    // jwt.verify(token, jwtSecret, (err, decode) =>{
    //   console.log("token", token);

    const sql = `SELECT id_companies FROM offers WHERE id =?`;
    connection.query(sql, req.params.id_offer, (err, results) => {
      console.log(results, err);
    });
  });

/**
 * Sends the offers that matches the query and the questions Ids
 */
router.get("/search", (req, res) => {
  const { search, type, place } = req.query;
  searchEsc = connection.escape(`%${search}%`);
  typeEsc = connection.escape(type);
  placeEsc = connection.escape(`%${place}%`);
  const sql = `
      SELECT id, title, description, contract_type, place, id_companies, updated_at
      FROM offers 
      WHERE is_active=1
      AND is_published=1
      ${search ? "AND title LIKE" + searchEsc : ""}
      ${place ? "AND place LIKE" + placeEsc : ""}
      ${type ? "AND contract_type=" + typeEsc : ""}
      `;
  connection.query(sql, (err, results) => {
    if (err) {
      res.status(500).send(`Erreur serveur : ${err}`);
    } else {
      res.json(results);
    }
  });
});

/**
 * Sends details of an offer from its id and adds the questions ids of the offer
 */
router.get("/details/:id_offers", (req, res) => {
  const sqlOffer = `
    SELECT title, description, contract_type, place, id_companies
    FROM offers
    WHERE id = ?`;
  const { id_offers } = req.params;
  connection.query(sqlOffer, id_offers, (errOffer, resultsOffer) => {
    if (errOffer) {
      res.status(500).send(`Erreur serveur : ${errOffer}`);
    } else {
      const sqlQuestions = `
        SELECT id_questions 
        FROM offers_questions
        WHERE id_offers= ?`;
      connection.query(
        sqlQuestions,
        id_offers,
        (errQuestions, resultsQuestions) => {
          if (errQuestions) {
            res.status(500).send(`Erreur serveur : ${errQuestions}`);
          } else {
            res.json({
              ...resultsOffer[0],
              questions: resultsQuestions.map(q => q.id_questions)
            });
          }
        }
      );
    }
  });
});

module.exports = router;
