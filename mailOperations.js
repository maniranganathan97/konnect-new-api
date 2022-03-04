var nodemailer = require("nodemailer");
var fs = require("fs");
function sendEmail(emailId, token) {
  return new Promise((resolve, reject) => {
    var transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "manir1389@gmail.com",
        pass: "eznp beoc wngy mdaf",
      },
      from: "manir1389@gmail.com",
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
        if (err) {
          reject(err);
        } else {
          var recovery_token = "tested";
          var resetLink = "http://localhost:3001/resetPassword?token=" + token;
          html = html.replace("#token#", token);
          var mailOptions = {
            from: "manir1389@gmail.com",
            to: emailId,
            subject: "Reset Password for PEST application",
            html: html,
            // html: '<p>Click <a href="http://localhost:3000/sessions/recover/' + recovery_token + '">here</a> to reset your password</p>',

            // text: `Please select this link to proceed to change the password and it will expire in 2 days\n${resetLink}`,
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
