const express = require('express');
const bodyParser = require('body-parser');

require('dotenv').config;

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/**
 * Variables globales
 */
const VALID_CARDS = ['4111111111111111', '5555555555554444']; // Visa y MasterCard demo
const INVALID_CARDS = ['0000000000000000', '1234567812345678'];

/**
 * Ruta para generar link
 * POST /link/generate
 */
app.post('/link/generate', (req, res) => {
    const { totalPago, remote, conversationId } = req.body;

    const baseUrl = process.env.BASE_URL;

    const paymentUrl = `${baseUrl}/?totalPago=${encodeURIComponent(totalPago)}&remote=${encodeURIComponent(remote)}&conversationId=${encodeURIComponent(conversationId)}`;

    return res.json({
        success: true,
        paymentUrl,
    });
});


/**
 * Ruta principal GET /
 * Renderiza la pasarela
 */
app.get('/', (req, res) => {
    const { totalPago, remote, conversationId } = req.query;

    if (!totalPago || !remote || !conversationId) {
        return res.status(400).send('Parámetros incompletos');
    }

    const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Auronix Demo Pay</title>

        <style>
            * {
            box-sizing: border-box;
            font-family: 'Segoe UI', sans-serif;
            }

            body {
            margin: 0;
            min-height: 100vh;
            background: linear-gradient(180deg, #1f3c72, #2a5298);
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            }

            .card {
            background: #fff;
            width: 100%;
            max-width: 1000px;
            border-radius: 18px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,.25);
            }

            /* LEFT – RESUMEN */
            .summary {
            padding: 40px;
            border-right: 1px solid #eee;
            display: flex;
            flex-direction: column;
            justify-content: center;
            }

            .summary h1 {
            margin: 0 0 30px;
            font-size: 28px;
            }

            .label {
            font-size: 18px;
            margin-bottom: 10px;
            }

            .total {
            font-size: 28px;
            font-weight: bold;
            }

            /* RIGHT – FORM */
            .form {
            padding: 40px;
            display: flex;
            justify-content: center;
            }

            .payment-box {
            width: 100%;
            max-width: 360px;
            }

            .logos {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            }

            .logos img {
            height: 28px;
            }

            input {
            width: 100%;
            padding: 14px;
            border: none;
            border-bottom: 1px solid #ccc;
            margin-bottom: 18px;
            font-size: 15px;
            outline: none;
            }

            .row {
            display: flex;
            gap: 12px;
            }

            button {
            margin-top: 20px;
            width: 100%;
            padding: 14px;
            border-radius: 8px;
            border: none;
            background: #2a5298;
            color: #fff;
            font-size: 16px;
            cursor: pointer;
            }

            button:hover {
            background: #1f3c72;
            }

            /* MOBILE */
            @media (max-width: 768px) {
            .card {
                grid-template-columns: 1fr;
            }

            .summary {
                border-right: none;
                border-bottom: 1px solid #eee;
                text-align: center;
            }
            }
        </style>
        </head>

        <body>
        <div class="card">

            <!-- LEFT: RESUMEN -->
            <div class="summary">
            <h1>Auronix Demo Pay</h1>
            <div class="label">Total a pagar:</div>
            <div class="total">$123 MXN</div>
            </div>

            <!-- RIGHT: FORMULARIO -->
            <div class="form">
            <div class="payment-box">
                <div class="logos">
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png">
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg">
                </div>

                <form method="POST" action="/pay">
                <input type="hidden" name="totalPago" value="{{totalPago}}">
                <input type="hidden" name="remote" value="{{remote}}">
                <input type="hidden" name="conversationId" value="{{conversationId}}">

                <input type="text" name="name" placeholder="Nombre del titular" required>
                <input type="text" name="card" placeholder="Número de tarjeta" maxlength="16" required>

                <div class="row">
                    <input
                    type="text"
                    name="exp"
                    id="exp"
                    placeholder="MM/AA"
                    maxlength="5"
                    inputmode="numeric"
                    autocomplete="cc-exp"
                    required
                    />
                    <input type="password" name="cvv" placeholder="CVV" maxlength="4" required>
                </div>

                <button type="submit">Pagar</button>
                </form>
            </div>
            </div>

        </div>
        <script>
            const expInput = document.getElementById('exp');
            expInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');

                if (value.length >= 2) {
                let month = parseInt(value.substring(0, 2), 10);
                if (month < 1) month = 1;
                if (month > 12) month = 12;
                value = month.toString().padStart(2, '0') + value.substring(2);
                }

                if (value.length >= 3) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
                }

                if (value.length === 5) {
                    document.getElementById('cvv').focus();
                }

                e.target.value = value;
            });
        </script>
        </body>
        </html>
  `;
    res.send(html.replace('{{totalPago}}', totalPago)
        .replace('{{remote}}', remote)
        .replace('{{conversationId}}', conversationId)
        .replace('$123 MXN', `$${totalPago} MXN`));
});

/**
 * Ruta que recibe formulario
 * POST /pay
 */
app.post('/pay', async (req, res) => {
    const { totalPago, remote, conversationId, card } = req.body;

    const approved = VALID_CARDS.includes(card);

    const ipgTransactionId = crypto.randomUUID();
    const webhookResult = await sendWebhookPayment({
        invoicenumber: conversationId,
        ponumber: remote,
        status: approved ? 'APROBADO' : 'FALLIDO',
        ipgTransactionId,
    });

    console.log('Webhook result:', webhookResult);

    const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Resultado de Pago</title>
        <style>
            body {
            font-family: Arial, sans-serif;
            background: ${approved ? '#2ecc71' : '#e74c3c'};
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            }
            .box {
            background: white;
            padding: 30px;
            border-radius: 16px;
            text-align: center;
            max-width: 320px;
            }
            h1 {
            margin-bottom: 10px;
            }
        </style>
        </head>
        <body>
        <div class="box">
            <h1>${approved ? '✅ Pago Aprobado' : '❌ Pago Rechazado'}</h1>
            <p>Monto: $${totalPago}</p>
            <p>Referencia: ${ipgTransactionId}</p><br>
            <h3>${approved ? 'Continua en el bot' : 'Intenta con otro metodo de pago'}</h3>
        </div>
        </body>
        </html>`;
    res.send(html);
});

/**
 * Envío real a webhook
 */
async function sendWebhookPayment({
    invoicenumber,
    ponumber,
    status,
    ipgTransactionId,
}) {
    try {
        const response = await fetch(
            process.env.WEBHOOK_URL,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    invoicenumber,
                    ponumber,
                    status,
                    ipgTransactionId,
                    transactionNotificationURL: 'test',
                }),
            }
        );

        // ⚠️ Algunos webhooks no regresan JSON
        const text = await response.text();
        let data = null;

        try {
            data = text ? JSON.parse(text) : null;
        } catch (e) {
            data = text;
        }

        return {
            success: response.ok,
            statusCode: response.status,
            response: data,
        };

    } catch (error) {
        console.error('Error enviando webhook:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}



app.listen(3000, () => {
    console.log('Auronix Demo Pay corriendo en http://localhost:3000');
});
