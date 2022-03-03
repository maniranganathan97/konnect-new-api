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
      from: "manir1389@gmail.com"
    });
    fs.readFile(
      "password-reset.html",
      { encoding: "utf-8" },
      function (err, html) {
        if (err) {
          reject(err);
        } else {
          var resetLink = "http://localhost:3001/resetPassword?token=" + token;
          html = html.replace("#token#", token);
          var mailOptions = {
            from: "manir1389@gmail.com",
            to: emailId,
            subject: "Reset Password for PEST application",
            html: html,
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
