const express = require('express')

const app = express()
const PORT = 4000

app.get('/', (req, res) => {
  res.status(200).send({ success: true })
});

app.listen(PORT, () => console.log(`Node App listening on PORT ${PORT}!`))