import nodemailer from "nodemailer";

export const sendResetPasswordEmail = async (to: string, token: string) => {
    const transporter = nodemailer.createTransport({
        // Configure with your actual SMTP details
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT) || 587,
        secure: process.env.EMAIL_SERVER_SECURE === "true", // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
        },
    });

    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
        from: `"Suivi Navires DSM" <${process.env.EMAIL_FROM}>`,
        to,
        subject: "Réinitialisation de votre mot de passe",
        html: `
      <h2>Réinitialisation de mot de passe</h2>
      <p>Vous avez demandé à réinitialiser votre mot de passe pour l'application Suivi Navires DSM.</p>
      <p>Veuillez cliquer sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
      <a href="${resetLink}">Réinitialiser mon mot de passe</a>
      <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>
      <br />
      <p>L'équipe DSM</p>
    `,
    });
};
