"use strict";

/* ---------- Elementos de la página ---------- */
const formulario = document.getElementById("estimador-form");
const cajaError = document.getElementById("error");
const cajaResultado = document.getElementById("resultado");
const valorResultado = document.getElementById("resultado-valor");
const textoReferencia = document.getElementById("resultado-ref");
const estadoModelo = document.getElementById("estado-modelo");
const metricaMae = document.getElementById("metrica-mae");
const metricaR2 = document.getElementById("metrica-r2");

let modelo = null;

/* ---------- Carga del modelo (modelo.json en la raíz) ---------- */
function usarModelo(datos) {
  modelo = datos;
  metricaMae.textContent = "S/ " + Number(datos.metrics.mae_test).toFixed(2);
  metricaR2.textContent = Number(datos.metrics.r2_test).toFixed(3);
  estadoModelo.textContent = "Modelo cargado correctamente.";
}

if (window.MODELO_INCRUSTADO) {
  usarModelo(window.MODELO_INCRUSTADO);
} else {
  fetch("modelo.json", { cache: "no-store" })
    .then((respuesta) => {
      if (!respuesta.ok) throw new Error("No se pudo cargar modelo.json");
      return respuesta.json();
    })
    .then(usarModelo)
    .catch(() => {
      estadoModelo.textContent =
        "No se pudo cargar modelo.json. Comprueba que esté en la raíz del repositorio y abre la web mediante un servidor.";
      formulario.querySelector("button").disabled = true;
    });
}

/* ---------- Utilidades ---------- */
function leerNumero(texto) {
  const numero = Number(texto.trim().replace(",", "."));
  return texto.trim() !== "" && Number.isFinite(numero) ? numero : null;
}

function mostrarError(mensajes) {
  cajaError.innerHTML = "<strong>Revisa los datos:</strong><ul>" +
    mensajes.map((m) => "<li>" + m + "</li>").join("") + "</ul>";
  cajaError.hidden = false;
}

function estimar(distancia, carga, via) {
  const c = modelo.coefficients;
  return modelo.intercept + c.distancia_km * distancia + c.carga_kg * carga + c.via_no_asfaltada * via;
}

/* ---------- Envío del formulario ---------- */
formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  cajaError.hidden = true;
  cajaResultado.hidden = true;

  if (!modelo) {
    mostrarError(["El modelo aún no está disponible. Recarga la página e inténtalo de nuevo."]);
    return;
  }

  const rango = modelo.validation;
  const distancia = leerNumero(document.getElementById("distancia_km").value);
  const carga = leerNumero(document.getElementById("carga_kg").value);
  const via = Number(document.getElementById("via_no_asfaltada").value);

  const errores = [];
  if (distancia === null || distancia < rango.distancia_km.min || distancia > rango.distancia_km.max) {
    errores.push(`La distancia debe ser un número entre ${rango.distancia_km.min} y ${rango.distancia_km.max} km.`);
  }
  if (carga === null || carga < rango.carga_kg.min || carga > rango.carga_kg.max) {
    errores.push(`La carga debe ser un número entre ${rango.carga_kg.min} y ${rango.carga_kg.max} kg.`);
  }
  if (!rango.via_no_asfaltada.includes(via)) {
    errores.push("Elige el tipo de vía: asfaltada o no asfaltada.");
  }
  if (errores.length) {
    mostrarError(errores);
    return;
  }

  valorResultado.textContent = "S/ " + Math.max(0, estimar(distancia, carga, via)).toFixed(2);
  textoReferencia.textContent =
    "Referencia: el modelo se equivoca en promedio unos S/ " + modelo.metrics.mae_test.toFixed(2) + ".";
  cajaResultado.hidden = false;
});
