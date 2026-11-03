// Lee la foto de una planilla de inscripción (hoja impresa con Nombre, RUT y
// Fecha de nacimiento) con Claude y devuelve las filas como datos.
//
// Lo que sale de acá es solo una propuesta: la ruta la valida (RUT, fecha,
// edad para la serie) y el admin la revisa en pantalla antes de guardar. Por
// eso se pide transcribir tal cual, sin "arreglar" RUT ni fechas: un dígito
// verificador corregido por el modelo escondería justo el error que la
// asociación necesita ver.

const Anthropic = require('@anthropic-ai/sdk');

const MODELO = 'claude-opus-5-5';
const SERIES_PLANILLA = ['SUB13', 'SUB15', 'SUB17', 'SENIOR', 'SEGUNDA_ADULTO', 'PRIMERA_ADULTO'];

function disponible() {
  return Boolean((process.env.ANTHROPIC_API_KEY || '').trim());
}

function esquema(clubes) {
  return {
    type: 'object',
    properties: {
      club: { type: 'string', enum: [...clubes, ''] },
      clubTexto: { type: 'string' },
      serie: { type: 'string', enum: [...SERIES_PLANILLA, ''] },
      serieTexto: { type: 'string' },
      jugadores: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nombre: { type: 'string' },
            rut: { type: 'string' },
            fechaTexto: { type: 'string' },
            fechaNacimiento: { type: 'string' },
            dudoso: { type: 'boolean' },
            nota: { type: 'string' },
          },
          required: ['nombre', 'rut', 'fechaTexto', 'fechaNacimiento', 'dudoso', 'nota'],
          additionalProperties: false,
        },
      },
    },
    required: ['club', 'clubTexto', 'serie', 'serieTexto', 'jugadores'],
    additionalProperties: false,
  };
}

function instrucciones(clubes) {
  return `Esta es la foto de una planilla de inscripción de jugadores de un campeonato de fútbol amateur en Chile. Transcribe cada fila de la tabla.

Club: busca el nombre del club en el encabezado, el título o la firma (por ejemplo "LISTADO JUVENTUD PLATENSE 2026" o una firma que dice "Platense"). En "clubTexto" copia lo que dice la hoja. En "club" elige el que corresponda de esta lista, o "" si no se puede saber con seguridad: ${clubes.join(', ')}. El timbre de la organización o de la liga no es el club.

Serie: está escrita en el título o en una columna "Serie" (Sub-13, Sub-15, Sub-17, Seniors, Segunda, Primera). En "serieTexto" copia lo que dice la hoja. En "serie" usa el código: SUB13, SUB15, SUB17, SENIOR, SEGUNDA_ADULTO o PRIMERA_ADULTO, o "" si no aparece.

Jugadores, uno por fila de la tabla, en el orden de la hoja:
- nombre: el nombre completo como está escrito, sin el número de fila del principio ("3-Gabriel ..." pasa a "Gabriel ...").
- rut: exactamente como está escrito, con sus puntos y guion. No lo corrijas aunque parezca tener un dígito de más o de menos.
- fechaTexto: la fecha tal como está escrita.
- fechaNacimiento: la misma fecha en formato AAAA-MM-DD. Las fechas chilenas son día-mes-año ("04-ene-09" es 2009-01-04). Si no se puede interpretar, "".
- dudoso: true si algún carácter del nombre, RUT o fecha no se lee con claridad en la foto.
- nota: explica brevemente qué no se lee bien, o "" si nada.

No inventes filas ni completes datos que no están en la foto.`;
}

async function leerPlanilla({ imagen, tipoMime, clubes }) {
  const client = new Anthropic();
  const respuesta = await client.beta.messages.create({
    model: MODELO,
    max_tokens: 16000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: esquema(clubes) } },
    // Si un clasificador de seguridad rechaza la foto por error, la API
    // reintenta sola con otro modelo en vez de dejar la carga en blanco.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: tipoMime, data: imagen.toString('base64') } },
        { type: 'text', text: instrucciones(clubes) },
      ],
    }],
  });

  if (respuesta.stop_reason === 'refusal') {
    throw new Error('No se pudo leer la foto. Prueba con otra foto de la planilla.');
  }
  if (respuesta.stop_reason === 'max_tokens') {
    throw new Error('La planilla es demasiado larga para leerla de una vez. Sácale fotos por partes.');
  }
  const texto = respuesta.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(texto);
}

module.exports = { leerPlanilla, disponible, SERIES_PLANILLA };
