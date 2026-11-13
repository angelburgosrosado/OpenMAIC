import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL, LEGAL_VERSION } from '@/lib/legal';
import { LegalShell } from '../privacy/LegalShell';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The rules for using QuéWhat, the bilingual family learning space.',
  alternates: { canonical: '/terms' },
};

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" titleEs="Términos del servicio" version={LEGAL_VERSION}>
      {/* ───────────── English ───────────── */}
      <section lang="en">
        <p>
          These terms are an agreement between you and QuéWhat for using quewhat.com and the QuéWhat
          apps (the “Service”). By creating an account or using the Service you agree to them and to
          our <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>1. Who can use QuéWhat</h2>
        <ul>
          <li>You must be 18 or older to create an account.</li>
          <li>
            Children may use QuéWhat only through an adult’s account, with that adult’s permission
            and supervision. The account holder is responsible for how children use the account.
          </li>
          <li>Keep your password private. You are responsible for activity on your account.</li>
        </ul>

        <h2>2. What QuéWhat is — and isn’t</h2>
        <p>
          QuéWhat uses artificial intelligence to explain concepts, build classrooms and write quiz
          questions. It is a learning aid, not a replacement for teachers, schools, tutors or
          professional advice. AI can make mistakes: please double-check important answers, and use
          QuéWhat to understand the work, not to hand in answers you didn’t do. Follow your school’s
          or homeschool program’s rules about AI help.
        </p>

        <h2>3. Acceptable use</h2>
        <p>Please don’t use QuéWhat to:</p>
        <ul>
          <li>break the law, or harass, bully or harm anyone;</li>
          <li>
            upload content that is sexual, violent, hateful, or that you don’t have the right to
            share;
          </li>
          <li>
            share other people’s personal information, or children’s faces, names or contact
            details;
          </li>
          <li>
            try to break, overload, scrape or get around the security or limits of the Service;
          </li>
          <li>resell or give others access to your account.</li>
        </ul>
        <p>We may remove content or suspend accounts that break these rules.</p>

        <h2>4. Your content</h2>
        <p>
          You keep ownership of what you type or upload. You give us permission to process it only
          to run the Service for you (for example, sending a homework question to our AI provider to
          get an explanation). Content the AI generates for you is yours to use for personal,
          family, classroom and homeschool learning.
        </p>

        <h2>5. Plans, credits and payments</h2>
        <ul>
          <li>
            Some features use AI credits. Free credits and paid plans are described on the pricing
            page.
          </li>
          <li>Payments are processed by Stripe. Prices are shown before you pay.</li>
          <li>
            Subscriptions renew automatically until you cancel. You can cancel any time from “Manage
            billing”; you keep access until the end of the paid period.
          </li>
          <li>
            Credit packs don’t expire while your account is open, are not redeemable for cash, and
            can’t be transferred. If something went wrong with a charge, contact us and we’ll make
            it right.
          </li>
        </ul>

        <h2>6. Our service</h2>
        <p>
          The QuéWhat name, logo and design are ours. We may change, add or remove features, and we
          try to give notice of significant changes.
        </p>

        <h2>7. Ending your account</h2>
        <p>
          You can stop using QuéWhat and ask us to delete your account at any time by writing to{' '}
          {mail}. We may suspend or close accounts that break these terms or put others at risk.
        </p>

        <h2>8. Disclaimers and limits</h2>
        <p>
          The Service is provided “as is” and “as available.” To the extent the law allows, we don’t
          promise it will always be accurate, uninterrupted or error-free, and we are not liable for
          indirect or consequential losses. Our total liability for any claim is limited to the
          amount you paid us in the 12 months before the claim. Some places don’t allow these
          limits, so they may not apply to you.
        </p>

        <h2>9. Changes to these terms</h2>
        <p>
          We may update these terms. We’ll change the date above and, for important changes, notify
          account holders in advance. Continuing to use QuéWhat after a change means you accept it.
        </p>

        <h2>10. Contact</h2>
        <p>Questions? Email {mail}.</p>
      </section>

      {/* ───────────── Español ───────────── */}
      <section lang="es" id="es" className="lang">
        <h1>Términos del servicio</h1>
        <p>
          Estos términos son un acuerdo entre tú y QuéWhat para usar quewhat.com y las apps de
          QuéWhat (el “Servicio”). Al crear una cuenta o usar el Servicio aceptas estos términos y
          nuestra <Link href="/privacy#es">Política de privacidad</Link>. Si hay diferencias entre
          las versiones, prevalece la versión en inglés.
        </p>

        <h2>1. Quién puede usar QuéWhat</h2>
        <ul>
          <li>Debes tener 18 años o más para crear una cuenta.</li>
          <li>
            Los niños solo pueden usar QuéWhat con la cuenta de un adulto, con su permiso y
            supervisión. El titular de la cuenta es responsable de cómo la usan los niños.
          </li>
          <li>Mantén tu contraseña en privado. Eres responsable de la actividad de tu cuenta.</li>
        </ul>

        <h2>2. Qué es QuéWhat — y qué no es</h2>
        <p>
          QuéWhat usa inteligencia artificial para explicar conceptos, crear clases y escribir
          preguntas de trivia. Es una ayuda para aprender, no reemplaza a maestros, escuelas,
          tutores ni asesoría profesional. La IA puede equivocarse: verifica las respuestas
          importantes y usa QuéWhat para entender el trabajo, no para entregar respuestas que no
          hiciste. Sigue las reglas de tu escuela o programa de educación en el hogar sobre el uso
          de IA.
        </p>

        <h2>3. Uso aceptable</h2>
        <p>Por favor no uses QuéWhat para:</p>
        <ul>
          <li>violar la ley, acosar, intimidar o hacerle daño a alguien;</li>
          <li>subir contenido sexual, violento, de odio, o que no tengas derecho a compartir;</li>
          <li>
            compartir información personal de otras personas, ni caras, nombres o contactos de
            niños;
          </li>
          <li>
            intentar romper, sobrecargar, extraer datos o evadir la seguridad o los límites del
            Servicio;
          </li>
          <li>revender tu cuenta o darle acceso a otras personas.</li>
        </ul>
        <p>Podemos quitar contenido o suspender cuentas que rompan estas reglas.</p>

        <h2>4. Tu contenido</h2>
        <p>
          Lo que escribes o subes sigue siendo tuyo. Nos das permiso de procesarlo solo para darte
          el Servicio (por ejemplo, enviar una pregunta de tarea a nuestro proveedor de IA para
          obtener una explicación). El contenido que la IA genera para ti es tuyo para usarlo en el
          aprendizaje personal, familiar, de salón y de educación en el hogar.
        </p>

        <h2>5. Planes, créditos y pagos</h2>
        <ul>
          <li>
            Algunas funciones usan créditos de IA. Los créditos gratis y los planes pagos se
            describen en la página de precios.
          </li>
          <li>Los pagos los procesa Stripe. Los precios se muestran antes de pagar.</li>
          <li>
            Las suscripciones se renuevan automáticamente hasta que las canceles. Puedes cancelar
            cuando quieras desde “Administrar facturación”; mantienes el acceso hasta el final del
            periodo pagado.
          </li>
          <li>
            Los paquetes de créditos no vencen mientras tu cuenta esté abierta, no se cambian por
            dinero y no se pueden transferir. Si algo salió mal con un cobro, escríbenos y lo
            arreglamos.
          </li>
        </ul>

        <h2>6. Nuestro servicio</h2>
        <p>
          El nombre, el logo y el diseño de QuéWhat son nuestros. Podemos cambiar, añadir o quitar
          funciones, e intentamos avisar de los cambios importantes.
        </p>

        <h2>7. Cerrar tu cuenta</h2>
        <p>
          Puedes dejar de usar QuéWhat y pedirnos borrar tu cuenta en cualquier momento escribiendo
          a {mail}. Podemos suspender o cerrar cuentas que rompan estos términos o pongan en riesgo
          a otros.
        </p>

        <h2>8. Exenciones y límites</h2>
        <p>
          El Servicio se ofrece “tal cual” y “según disponibilidad”. En la medida en que la ley lo
          permita, no garantizamos que siempre sea exacto, ininterrumpido o sin errores, y no somos
          responsables de pérdidas indirectas o consecuentes. Nuestra responsabilidad total por
          cualquier reclamo se limita a lo que nos pagaste en los 12 meses anteriores al reclamo.
          Algunas jurisdicciones no permiten estos límites, así que podrían no aplicarte.
        </p>

        <h2>9. Cambios a estos términos</h2>
        <p>
          Podemos actualizar estos términos. Cambiaremos la fecha de arriba y, si el cambio es
          importante, avisaremos con anticipación a los titulares de cuenta. Si sigues usando
          QuéWhat después de un cambio, lo aceptas.
        </p>

        <h2>10. Contacto</h2>
        <p>¿Preguntas? Escribe a {mail}.</p>
      </section>
    </LegalShell>
  );
}
