var nodemailer = require("nodemailer");
var fs = require("fs");

var configPath = './config.json';
var configData = JSON.parse(fs.readFileSync(configPath, 'UTF-8'));

function sendEmail(emailId, token) {
  return new Promise((resolve, reject) => {
    var transporter = nodemailer.createTransport({
      host: "mail209.livehostsupport.com",
      auth: {
        user: "no-reply@pestpro-mailer.com",
        pass: "*!4SNLH%$+V&A(#~+A",
      },
      from: "no-reply@pestpro-mailer.com",
      secure: true,
      port: 465,
      headers: {
        "x-priority": "1",
        "x-msmail-priority": "High",
        importance: "high"
    }
    });
    fs.readFile(
      "password-reset.html",
      { encoding: "utf-8" },
      function (err, html) {
        console.log("configData.clientUrl-------->" + configData.clientUrl);
        if (err) {
          reject(err);
        } else {
          var recovery_token = "tested";
          var resetLink = "http://knighttest.net/resetPassword?token=" + token;
          html = html.replace("#token#", token);
          html = html.replace("#url#", configData.clientUrl);
          var mailOptions = {
            from: "no-reply@pestpro-mailer.com",
            to: emailId,
            subject: "Reset Password for PEST application",
            html: html,
            priority: "high",
          };

          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              reject(error);
            } else {
              resolve("Email sent: " + info.response);
            }
          });
        }
      }
    );
  });
}

module.exports = { sendEmail };
