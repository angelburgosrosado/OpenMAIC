import type { Metadata } from 'next';
import { CONTACT_EMAIL, LEGAL_VERSION } from '@/lib/legal';
import { LegalShell } from './LegalShell';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How QuéWhat collects, uses and protects information — including children’s privacy.',
  alternates: { canonical: '/privacy' },
};

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" titleEs="Política de privacidad" version={LEGAL_VERSION}>
      {/* ───────────── English ───────────── */}
      <section lang="en">
        <div className="callout">
          <strong>The short version.</strong> QuéWhat is a learning space for families. Accounts
          belong to adults. We collect only what we need to run the service, we never sell your
          information, we don’t show ads, and we don’t knowingly collect personal information from
          children under 13.
        </div>

        <h2>1. Who we are</h2>
        <p>
          QuéWhat (“QuéWhat”, “we”, “us”) operates quewhat.com and the QuéWhat apps for Android,
          Android TV, Fire TV and Fire tablets. Questions about this policy: {mail}.
        </p>

        <h2>2. Accounts are for adults</h2>
        <p>
          You must be 18 or older to create an account. Parents, guardians, teachers and adult
          learners create accounts; children learn through a grown-up’s account and under that
          adult’s supervision. Children do not create their own accounts, and we do not ask children
          for their name, email, age, address, photo or any other contact information.
        </p>

        <h2>3. Information we collect</h2>
        <h3>From account holders (adults)</h3>
        <ul>
          <li>
            <strong>Account details:</strong> email address, display name, and your password (stored
            only as a salted, one-way hash).
          </li>
          <li>
            <strong>Billing:</strong> if you buy a plan or credits, payment is handled by Stripe. We
            never see or store your full card number. We keep a Stripe customer reference and a
            record of your purchases.
          </li>
          <li>
            <strong>Usage:</strong> how many AI credits you use, which features you use, and basic
            technical logs (for example timestamps and error messages) needed to keep the service
            secure and working.
          </li>
          <li>
            <strong>Consent record:</strong> the date you confirmed you are 18+ and accepted these
            terms.
          </li>
        </ul>
        <h3>What you or your family type or upload while learning</h3>
        <ul>
          <li>
            Homework questions, photos of homework pages, classroom topics and quiz topics. These
            are sent to our AI provider to produce the lesson, explanation or questions you asked
            for.
          </li>
          <li>
            <strong>Please don’t include personal details</strong> (full names, addresses, school
            names, faces) in homework text or photos. Crop photos to just the problem.
          </li>
        </ul>
        <h3>Family quiz night players</h3>
        <ul>
          <li>
            Players joining a game on a phone enter only a <strong>nickname</strong>. We recommend
            first names or fun nicknames. Nicknames, answers and scores are stored only for the game
            and are automatically deleted within 4 hours. No account, email or contact information
            is collected from players.
          </li>
        </ul>
        <h3>Stored on your device</h3>
        <ul>
          <li>
            A sign-in cookie (and, where the site uses an access code, an access cookie) — both are
            essential and are not used for tracking.
          </li>
          <li>
            Your language choice and the classrooms you create are kept in your browser’s local
            storage, so they stay on your device unless you choose to share or export them.
          </li>
        </ul>
        <p>
          We use Vercel Web Analytics to see aggregate traffic trends, like how many people visit
          each page. It doesn’t use cookies, doesn’t track you across other websites, and doesn’t
          build a profile of you or your child. We do not use advertising cookies or cross-site
          tracking.
        </p>

        <h2>4. How we use information</h2>
        <ul>
          <li>To provide lessons, homework help, quizzes and classrooms you ask for.</li>
          <li>To manage your account, credits, subscriptions and receipts.</li>
          <li>To keep QuéWhat safe, prevent abuse and fix problems.</li>
          <li>To contact you about your account or important changes to the service.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell or rent personal information, use it for targeted
          advertising, or build profiles of children. We do not use what you type to train our own
          AI models.
        </p>

        <h2>5. Who we share it with</h2>
        <p>
          We share information only with service providers who help us run QuéWhat, under contract:
        </p>
        <ul>
          <li>
            <strong>Anthropic</strong> (AI model provider) — receives the questions, photos and
            topics needed to generate a response. Anthropic does not use API inputs to train its
            models by default.
          </li>
          <li>
            <strong>Vercel</strong> (hosting, and privacy-friendly, cookieless website analytics) and{' '}
            <strong>Neon</strong> (database) — store and serve the service.
          </li>
          <li>
            <strong>Stripe</strong> (payments) — processes payments and billing.
          </li>
        </ul>
        <p>
          We may also disclose information if required by law, or to protect the safety of our users
          or the public.
        </p>

        <h2>6. Children’s privacy (COPPA)</h2>
        <p>
          QuéWhat is designed for families, and children may use it alongside a parent, guardian or
          teacher. We do not knowingly collect personal information from children under 13. Children
          don’t create accounts, quiz players give only a nickname that is deleted within 4 hours,
          and we ask families not to include personal details in homework questions or photos.
        </p>
        <p>
          If you believe a child under 13 has given us personal information, email {mail} and we
          will delete it promptly. Parents and guardians can ask us at any time to review or delete
          information related to their child and to stop any further collection.
        </p>

        <h2>7. How long we keep it</h2>
        <ul>
          <li>
            Account information: while your account is open, and deleted within 30 days after you
            close it.
          </li>
          <li>Quiz games: deleted automatically within 4 hours.</li>
          <li>Purchase records: kept as long as tax and accounting laws require.</li>
          <li>Technical logs: kept for a limited period for security and troubleshooting.</li>
        </ul>

        <h2>8. Your choices and rights</h2>
        <p>
          You can view and update your profile in your account. You can ask us to access, correct,
          export or delete your personal information by writing to {mail}. Depending on where you
          live (for example California or the European Union), you may have additional rights; we
          honor them for everyone.
        </p>

        <h2>9. Security</h2>
        <p>
          We use encrypted connections (HTTPS), hashed passwords, signed session cookies and access
          controls. No system is perfectly secure, so please use a strong, unique password.
        </p>

        <h2>10. Changes</h2>
        <p>
          If we change this policy, we will update the date above and, for important changes, let
          account holders know before the change takes effect.
        </p>

        <h2>11. Contact</h2>
        <p>Email {mail}.</p>
      </section>

      {/* ───────────── Español ───────────── */}
      <section lang="es" id="es" className="lang">
        <h1>Política de privacidad</h1>
        <div className="callout">
          <strong>En resumen.</strong> QuéWhat es un espacio de aprendizaje para familias. Las
          cuentas son de adultos. Recopilamos solo lo necesario para dar el servicio, nunca vendemos
          tu información, no mostramos anuncios y no recopilamos a sabiendas información personal de
          niños menores de 13 años.
        </div>

        <h2>1. Quiénes somos</h2>
        <p>
          QuéWhat opera quewhat.com y las apps de QuéWhat para Android, Android TV, Fire TV y
          tabletas Fire. Preguntas sobre esta política: {mail}.
        </p>

        <h2>2. Las cuentas son para adultos</h2>
        <p>
          Debes tener 18 años o más para crear una cuenta. Madres, padres, tutores, maestros y
          adultos que aprenden crean las cuentas; los niños aprenden con la cuenta de un adulto y
          bajo su supervisión. Los niños no crean cuentas propias y no les pedimos nombre, correo,
          edad, dirección, foto ni otros datos de contacto.
        </p>

        <h2>3. Información que recopilamos</h2>
        <h3>De los titulares de cuenta (adultos)</h3>
        <ul>
          <li>
            <strong>Datos de la cuenta:</strong> correo electrónico, nombre visible y contraseña
            (guardada solo como un hash irreversible con sal).
          </li>
          <li>
            <strong>Pagos:</strong> si compras un plan o créditos, el pago lo procesa Stripe. Nunca
            vemos ni guardamos el número completo de tu tarjeta. Guardamos una referencia de cliente
            de Stripe y el historial de compras.
          </li>
          <li>
            <strong>Uso:</strong> cuántos créditos de IA usas, qué funciones usas y registros
            técnicos básicos necesarios para mantener el servicio seguro y funcionando.
          </li>
          <li>
            <strong>Registro de consentimiento:</strong> la fecha en que confirmaste que tienes 18
            años o más y aceptaste estos términos.
          </li>
        </ul>
        <h3>Lo que tú o tu familia escriben o suben al aprender</h3>
        <ul>
          <li>
            Preguntas de tarea, fotos de páginas de tarea, temas de clases y de trivia. Se envían a
            nuestro proveedor de IA para crear la lección, explicación o preguntas que pediste.
          </li>
          <li>
            <strong>Por favor no incluyas datos personales</strong> (nombres completos, direcciones,
            nombres de escuelas, caras) en el texto o las fotos. Recorta la foto para que solo se
            vea el problema.
          </li>
        </ul>
        <h3>Jugadores de la noche de trivia</h3>
        <ul>
          <li>
            Quien se une desde un celular escribe solo un <strong>apodo</strong>. Recomendamos
            nombres de pila o apodos divertidos. Los apodos, respuestas y puntos se guardan solo
            durante el juego y se borran automáticamente en un máximo de 4 horas. No se pide cuenta,
            correo ni datos de contacto.
          </li>
        </ul>
        <h3>Guardado en tu dispositivo</h3>
        <ul>
          <li>
            Una cookie de sesión (y, si el sitio usa código de acceso, una cookie de acceso). Ambas
            son esenciales y no se usan para rastrearte.
          </li>
          <li>
            Tu idioma y las clases que creas se guardan en el almacenamiento local de tu navegador,
            así que se quedan en tu dispositivo a menos que decidas compartirlas o exportarlas.
          </li>
        </ul>
        <p>
          Usamos Vercel Web Analytics para ver tendencias generales de tráfico, como cuántas
          personas visitan cada página. No usa cookies, no te rastrea en otros sitios web y no crea
          un perfil de ti ni de tu hijo o hija. No usamos cookies de publicidad ni rastreo entre
          sitios.
        </p>

        <h2>4. Cómo usamos la información</h2>
        <ul>
          <li>Para darte las lecciones, ayuda con tareas, trivias y clases que pides.</li>
          <li>Para administrar tu cuenta, créditos, suscripciones y recibos.</li>
          <li>Para mantener QuéWhat seguro, evitar abusos y arreglar problemas.</li>
          <li>Para avisarte sobre tu cuenta o cambios importantes del servicio.</li>
        </ul>
        <p>
          <strong>No</strong> vendemos ni alquilamos información personal, no la usamos para
          publicidad dirigida y no creamos perfiles de niños. No usamos lo que escribes para
          entrenar modelos de IA propios.
        </p>

        <h2>5. Con quién la compartimos</h2>
        <p>Solo con proveedores que nos ayudan a operar QuéWhat, bajo contrato:</p>
        <ul>
          <li>
            <strong>Anthropic</strong> (proveedor del modelo de IA): recibe las preguntas, fotos y
            temas necesarios para generar la respuesta. Por defecto, Anthropic no usa los datos de
            su API para entrenar sus modelos.
          </li>
          <li>
            <strong>Vercel</strong> (alojamiento, y analítica de sitio web sin cookies y respetuosa
            de la privacidad) y <strong>Neon</strong> (base de datos): guardan y sirven el servicio.
          </li>
          <li>
            <strong>Stripe</strong> (pagos): procesa pagos y facturación.
          </li>
        </ul>
        <p>
          También podemos divulgar información si la ley lo exige, o para proteger la seguridad de
          los usuarios o del público.
        </p>

        <h2>6. Privacidad de los niños (COPPA)</h2>
        <p>
          QuéWhat está pensado para familias, y los niños pueden usarlo junto a una madre, padre,
          tutor o maestro. No recopilamos a sabiendas información personal de niños menores de 13
          años. Los niños no crean cuentas, los jugadores de trivia solo dan un apodo que se borra
          en 4 horas, y pedimos a las familias que no incluyan datos personales en las preguntas o
          fotos de tarea.
        </p>
        <p>
          Si crees que un niño menor de 13 años nos dio información personal, escribe a {mail} y la
          borraremos de inmediato. Madres, padres y tutores pueden pedirnos en cualquier momento
          revisar o borrar la información relacionada con su hijo o hija y detener cualquier
          recopilación.
        </p>

        <h2>7. Cuánto tiempo la guardamos</h2>
        <ul>
          <li>
            Datos de la cuenta: mientras la cuenta esté abierta; se borran en 30 días después de
            cerrarla.
          </li>
          <li>Juegos de trivia: se borran automáticamente en un máximo de 4 horas.</li>
          <li>Historial de compras: el tiempo que exijan las leyes fiscales y contables.</li>
          <li>Registros técnicos: por un periodo limitado, para seguridad y soporte.</li>
        </ul>

        <h2>8. Tus opciones y derechos</h2>
        <p>
          Puedes ver y actualizar tu perfil en tu cuenta. Puedes pedirnos acceder, corregir,
          exportar o borrar tu información personal escribiendo a {mail}. Según dónde vivas (por
          ejemplo California o la Unión Europea), puedes tener derechos adicionales; los respetamos
          para todos.
        </p>

        <h2>9. Seguridad</h2>
        <p>
          Usamos conexiones cifradas (HTTPS), contraseñas con hash, cookies de sesión firmadas y
          controles de acceso. Ningún sistema es perfecto, así que usa una contraseña fuerte y
          única.
        </p>

        <h2>10. Cambios</h2>
        <p>
          Si cambiamos esta política, actualizaremos la fecha de arriba y, si el cambio es
          importante, avisaremos a los titulares de cuenta antes de que entre en vigor.
        </p>

        <h2>11. Contacto</h2>
        <p>Escribe a {mail}.</p>
      </section>
    </LegalShell>
  );
}
