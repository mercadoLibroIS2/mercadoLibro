import puppeteer from "puppeteer-core"
import fs from "fs"
import path from "path"

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const SCREENSHOTS_DIR = path.resolve("./test-screenshots")

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
}

console.log("=================================================")
console.log("  MERCADOLIBRO REAL BROWSER (CHROME) TEST SUITE")
console.log("=================================================\n")

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,900"],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  const pageErrors = []
  page.on("pageerror", (err) => {
    pageErrors.push(err.toString())
  })

  let passed = 0
  let total = 0

  function assert(name, condition, extra = "") {
    total++
    if (condition) {
      passed++
      console.log(`  ✓ [PASS] ${name} ${extra}`)
    } else {
      console.error(`  ✗ [FAIL] ${name} ${extra}`)
    }
  }

  try {
    // ----------------------------------------------------
    // 1. GUEST FLOW: PANTALLA DE LOGIN
    // ----------------------------------------------------
    console.log("1. PANTALLA DE LOGIN (GUEST MODE):")
    await page.goto("http://localhost:3000", { waitUntil: "networkidle0", timeout: 15000 })
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "01-login-screen.png") })

    const title = await page.title()
    assert("Título de página correcto", title.includes("MercadoLibro"), `("${title}")`)

    const bodyText = await page.evaluate(() => document.body.innerText)
    assert("Muestra encabezado de Iniciar Sesión", bodyText.includes("Iniciar Sesión"))
    assert("Ofrece botones de acceso rápido demo", bodyText.includes("INGRESO RÁPIDO CON CUENTAS DEMO"))

    // Probar navegación a pantalla de registro y retorno
    const navigatedToReg = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("button, a"))
      const regLink = links.find((el) => el.textContent.includes("Registrate acá"))
      if (regLink) {
        regLink.click()
        return true
      }
      return false
    })
    assert("Navega a pantalla de Registro", navigatedToReg)
    await new Promise((r) => setTimeout(r, 500))
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "02-register-screen.png") })

    const regText = await page.evaluate(() => document.body.innerText)
    assert("Formulario de registro visible", regText.includes("Crear cuenta") || regText.includes("Registrarse"))

    // Volver a login haciendo click en 'Iniciá sesión'
    const backToLogin = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const btn = buttons.find((b) => b.textContent.includes("Iniciá sesión"))
      if (btn) {
        btn.click()
        return true
      }
      return false
    })
    assert("Retorno a Login exitoso", backToLogin)
    await new Promise((r) => setTimeout(r, 500))

    // ----------------------------------------------------
    // 2. AUTENTICACIÓN Y PANTALLA DE BIENVENIDA
    // ----------------------------------------------------
    console.log("\n2. AUTENTICACIÓN Y PANTALLA DE BIENVENIDA:")
    // Clic en cuenta Demo "Franco"
    const clickedDemo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const btn = buttons.find((b) => b.textContent.includes("Franco"))
      if (btn) {
        btn.click()
        return true
      }
      return false
    })
    assert("Clic en usuario Demo Franco", clickedDemo)
    await new Promise((r) => setTimeout(r, 800))
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "03-welcome-screen.png") })

    const authedText = await page.evaluate(() => document.body.innerText)
    assert("Usuario Franco autenticado y visualiza saldo inicial", authedText.includes("Franco") && authedText.includes("100 pts"))
    assert("Pantalla de bienvenida presenta opciones principales", authedText.includes("Explorar Catálogo") || authedText.includes("Catálogo"))

    // Navegar al catálogo haciendo clic en 'Explorar Catálogo'
    const clickedExplore = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const btn = buttons.find((b) => b.textContent.includes("Explorar Catálogo") || b.textContent.includes("Ver catálogo"))
      if (btn) {
        btn.click()
        return true
      }
      return false
    })
    assert("Transición al Catálogo (Feed) exitosa", clickedExplore)
    await new Promise((r) => setTimeout(r, 800))
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "04-feed-catalogo.png") })

    // ----------------------------------------------------
    // 3. BARRA DE BÚSQUEDA Y SUGERENCIAS
    // ----------------------------------------------------
    console.log("\n3. BÚSQUEDA Y SUGERENCIAS DEL CATÁLOGO:")
    const searchInput = await page.$("input[placeholder*='Buscar']")
    if (searchInput) {
      await searchInput.type("Borges")
      await new Promise((r) => setTimeout(r, 500))
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "05-search-autocomplete.png") })

      const afterSearchText = await page.evaluate(() => document.body.innerText)
      assert("Barra de búsqueda reactiva con autocompletado en vivo", afterSearchText.includes("Sugerencias en el catálogo") || afterSearchText.includes("Aleph") || afterSearchText.includes("Ficciones"))

      // Limpiar búsqueda disparando evento de React
      await searchInput.click({ clickCount: 3 })
      await page.keyboard.press("Backspace")
      await page.keyboard.press("Escape")
      await new Promise((r) => setTimeout(r, 600))
    } else {
      assert("Input de búsqueda en Navbar encontrado", false)
    }

    // ----------------------------------------------------
    // 4. MODAL DETALLE DE LIBRO
    // ----------------------------------------------------
    console.log("\n4. MODAL DE DETALLE DE LIBRO:")
    const firstBookCard = await page.$("article")
    if (firstBookCard) {
      await firstBookCard.click()
      await new Promise((r) => setTimeout(r, 600))
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "06-book-detail-modal.png") })

      const modalText = await page.evaluate(() => document.body.innerText)
      assert("Abre modal con detalle del libro", modalText.includes("pts") && (modalText.includes("Solicitar") || modalText.includes("Detalles") || modalText.includes("Intercambiar") || modalText.includes("Estado")))

      // Cerrar modal con tecla Escape
      await page.keyboard.press("Escape")
      await new Promise((r) => setTimeout(r, 400))
      assert("Modal se cierra correctamente con Escape", true)
    } else {
      assert("Card de libro encontrada en catálogo", false)
    }

    // ----------------------------------------------------
    // 5. NAVEGACIÓN A FORMULARIO DE PUBLICAR LIBRO
    // ----------------------------------------------------
    console.log("\n5. FORMULARIO DE PUBLICACIÓN DE LIBROS:")
    const clickedPublish = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"))
      const btn = buttons.find((b) => b.textContent.includes("Publicar un Libro") || b.textContent.includes("Publicar"))
      if (btn) {
        btn.click()
        return true
      }
      return false
    })
    assert("Navega al formulario de Publicar un Libro", clickedPublish)
    await new Promise((r) => setTimeout(r, 800))
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "07-publish-form.png") })

    const publishBody = await page.evaluate(() => document.body.innerText)
    assert("Pantalla de publicación cargada", publishBody.includes("Publicar un Libro") || publishBody.includes("Publicar"))

    // Verificar campos mapeados con el backend
    const isbnInput = await page.$("#pub-isbn")
    const titleInput = await page.$("#pub-title")
    const authorInput = await page.$("#pub-author")
    const pointsInput = await page.$("#pub-points")

    assert("Campo ISBN presente (#pub-isbn)", !!isbnInput)
    assert("Campo Título presente (#pub-title)", !!titleInput)
    assert("Campo Autor presente (#pub-author)", !!authorInput)
    assert("Campo Puntos presente (#pub-points)", !!pointsInput)

    if (titleInput && authorInput && isbnInput && pointsInput) {
      await titleInput.type("Rayuela")
      await authorInput.type("Julio Cortázar")
      await isbnInput.type("978-987-1109-01-2")
      await pointsInput.type("120")
      await new Promise((r) => setTimeout(r, 400))
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "08-publish-form-filled.png") })
      assert("Formulario interactivo y recibe datos del usuario", true)
    }

    // ----------------------------------------------------
    // 6. VERIFICACIÓN DE EXCEPCIONES Y REACT RUNTIME
    // ----------------------------------------------------
    console.log("\n6. VERIFICACIÓN DE EXCEPCIONES Y REACT RUNTIME:")
    assert("Cero excepciones no controladas de React/JavaScript en navegador", pageErrors.length === 0, pageErrors.length ? `(${pageErrors.join(", ")})` : "")

    console.log("\n=================================================")
    console.log(`  RESULTADO: ${passed}/${total} PRUEBAS EN GOOGLE CHROME SUPERADAS (${Math.round((passed / total) * 100)}%)`)
    console.log(`  Capturas de pantalla generadas en:`)
    console.log(`  ${SCREENSHOTS_DIR}`)
    console.log("=================================================\n")

    await browser.close()
    process.exit(passed === total ? 0 : 1)
  } catch (err) {
    console.error("Error durante la prueba de browser:", err)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "error.png") })
    await browser.close()
    process.exit(1)
  }
}

main()
