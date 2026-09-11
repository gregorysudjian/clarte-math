"use client";

import Link from "next/link";
import { site } from "../../lib/site";
import { Footer, Header } from "./site-chrome";
import { Icon } from "./icons";
import { useLocale } from "./locale-context";

type Section = { title: string; paragraphs?: string[]; items?: string[] };

export function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const { locale } = useLocale();
  const content = legalCopy[locale][type];
  return <><Header/><main id="main-content" className="legal-main"><div className="legal-container"><span className="eyebrow">Northstar Learning Montreal</span><h1>{content.title}</h1><p className="legal-updated">{content.updated}</p><article>{content.intro.map((text) => <p key={text}>{text}</p>)}{content.sections.map((section) => <section key={section.title}><h2>{section.title}</h2>{section.paragraphs?.map((text) => <p key={text}>{text}</p>)}{section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}</section>)}</article><Link className="legal-back" href="/"><Icon name="arrow" style={{ transform: "rotate(180deg)" }}/>{content.back}</Link></div></main><Footer/></>;
}

const legalCopy: Record<"en" | "fr", Record<"privacy" | "terms", { title: string; updated: string; intro: string[]; sections: Section[]; back: string }>> = {
  en: {
    privacy: {
      title: "Privacy policy", updated: "Last updated: August 2, 2026", back: "Back to the home page",
      intro: ["This policy explains how Northstar Learning Montreal collects, uses, and protects personal information when a parent, guardian, or student contacts us or requests tutoring."],
      sections: [
        { title: "Information we collect", items: ["Contact details such as name, email address, and phone number.", "Student information such as grade, mathematics learning goals, and scheduling preferences.", "Messages and records needed to coordinate tutoring."] },
        { title: "How information is used", paragraphs: ["Information is used to respond to requests, assess whether the tutoring service is a suitable fit, schedule lessons, communicate about the service, and meet reasonable legal or safety obligations. Information is not sold or used for unrelated advertising."] },
        { title: "Legal basis and consent", paragraphs: ["By submitting a request, you consent to the use of the information for the purposes described above. A parent or guardian should submit or approve information about a minor."] },
        { title: "Service providers", paragraphs: ["Requests are kept in the tutor's private records and may be forwarded by an email delivery provider. Providers receive only the information needed to perform their service and handle it under their own privacy and security terms."] },
        { title: "Retention and security", paragraphs: ["Information is kept only as long as reasonably needed for communication, tutoring administration, legal obligations, or dispute resolution. Reasonable safeguards are used, but no internet transmission or storage method can be guaranteed to be completely secure."] },
        { title: "Your choices", paragraphs: ["You may ask to access, correct, or delete your personal information, subject to legal requirements. You may also withdraw consent for future use where consent is the basis for processing."] },
        { title: "Contact", paragraphs: [`Privacy questions and requests can be sent to ${site.email}.`] },
      ],
    },
    terms: {
      title: "Terms of service", updated: "Last updated: August 2, 2026", back: "Back to the home page",
      intro: ["These terms apply to tutoring arranged with Northstar Learning Montreal. The specific lesson rate, duration, location, and schedule are confirmed directly before a booking becomes final."],
      sections: [
        { title: "Tutoring service", paragraphs: ["Tutoring provides educational support in mathematics for students from Grade 1 through CEGEP. It does not replace a school, teacher, professional assessment, or specialized educational service."] },
        { title: "Bookings", paragraphs: ["Submitting the website form is a request, not a confirmed appointment. A lesson is confirmed only after the tutor and parent, guardian, or adult student agree on the time, format, price, and other relevant details."] },
        { title: "Fees and payment", paragraphs: ["Rates and accepted payment methods are disclosed before confirmation. No charge is due solely because a request form was submitted."] },
        { title: "Cancellations and lateness", paragraphs: ["Any cancellation or lateness terms, including whether a fee may apply, will be clearly shared and agreed upon before booking. If no cancellation fee was disclosed, none will be charged."] },
        { title: "Students under 18", paragraphs: ["A parent or guardian must authorize tutoring for a minor, provide reliable contact information, and remain responsible for appropriate supervision and safe arrangements for in-person or online lessons."] },
        { title: "Learning outcomes", paragraphs: ["The tutor will provide lessons with reasonable care and preparation. Grades, test results, admissions, competition results, or a specific rate of progress are not guaranteed because outcomes depend on many factors, including participation and practice."] },
        { title: "Materials and conduct", paragraphs: ["Students should bring relevant materials and participate respectfully. Either party may end or reschedule a lesson if the environment is unsafe, inappropriate, or unsuitable for learning."] },
        { title: "Changes", paragraphs: ["These terms may be updated when the service changes. The date above identifies the current version. Material booking terms already agreed for a confirmed lesson will not be changed retroactively."] },
      ],
    },
  },
  fr: {
    privacy: {
      title: "Politique de confidentialité", updated: "Dernière mise à jour : 2 août 2026", back: "Retour à la page d’accueil",
      intro: ["Cette politique explique comment Northstar Learning Montreal recueille, utilise et protège les renseignements personnels lorsqu’un parent, un tuteur ou un élève communique avec nous ou demande du tutorat."],
      sections: [
        { title: "Renseignements recueillis", items: ["Coordonnées comme le nom, l’adresse courriel et le numéro de téléphone.", "Renseignements sur l’élève comme le niveau, les objectifs en mathématiques et les préférences d’horaire.", "Messages et notes nécessaires à l’organisation du tutorat."] },
        { title: "Utilisation des renseignements", paragraphs: ["Les renseignements servent à répondre aux demandes, à vérifier si le service convient, à planifier les séances, à communiquer au sujet du service et à respecter des obligations légales ou de sécurité raisonnables. Ils ne sont ni vendus ni utilisés pour de la publicité sans lien avec le service."] },
        { title: "Consentement", paragraphs: ["En envoyant une demande, vous consentez à l’utilisation des renseignements aux fins décrites. Un parent ou tuteur doit transmettre ou approuver les renseignements concernant une personne mineure."] },
        { title: "Fournisseurs de services", paragraphs: ["Les demandes sont conservées dans les dossiers privés du tuteur et peuvent être transmises par un fournisseur d’envoi de courriels. Ces fournisseurs reçoivent uniquement les renseignements nécessaires à son service et les traite selon ses propres conditions de confidentialité et de sécurité."] },
        { title: "Conservation et sécurité", paragraphs: ["Les renseignements sont conservés seulement pendant la période raisonnablement nécessaire aux communications, à l’administration du tutorat, aux obligations légales ou au règlement de différends. Des mesures raisonnables sont utilisées, mais aucune transmission ou méthode de stockage sur Internet ne peut être garantie comme entièrement sécurisée."] },
        { title: "Vos choix", paragraphs: ["Vous pouvez demander l’accès, la correction ou la suppression de vos renseignements, sous réserve des exigences légales. Vous pouvez aussi retirer votre consentement pour les utilisations futures lorsque le traitement repose sur ce consentement."] },
        { title: "Nous joindre", paragraphs: [`Les questions et demandes concernant la confidentialité peuvent être envoyées à ${site.email}.`] },
      ],
    },
    terms: {
      title: "Conditions de service", updated: "Dernière mise à jour : 2 août 2026", back: "Retour à la page d’accueil",
      intro: ["Ces conditions s’appliquent au tutorat organisé avec Northstar Learning Montreal. Le tarif, la durée, le lieu et l’horaire sont confirmés directement avant qu’une réservation devienne définitive."],
      sections: [
        { title: "Service de tutorat", paragraphs: ["Le tutorat offre un soutien pédagogique en mathématiques de la 1re année du primaire jusqu’au cégep. Il ne remplace pas une école, un enseignant, une évaluation professionnelle ou un service spécialisé."] },
        { title: "Réservations", paragraphs: ["L’envoi du formulaire constitue une demande et non un rendez-vous confirmé. Une séance est confirmée uniquement lorsque le tuteur et le parent, le tuteur légal ou l’élève adulte s’entendent sur l’horaire, le format, le prix et les autres détails pertinents."] },
        { title: "Tarifs et paiement", paragraphs: ["Les tarifs et les modes de paiement acceptés sont communiqués avant la confirmation. Aucun montant n’est dû uniquement parce qu’un formulaire a été envoyé."] },
        { title: "Annulations et retards", paragraphs: ["Toute condition d’annulation ou de retard, y compris les frais éventuels, sera clairement communiquée et acceptée avant la réservation. Si aucun frais d’annulation n’a été annoncé, aucun ne sera exigé."] },
        { title: "Élèves de moins de 18 ans", paragraphs: ["Un parent ou tuteur doit autoriser le tutorat, fournir des coordonnées fiables et veiller à une supervision ainsi qu’à des conditions sécuritaires appropriées pour les séances en personne ou en ligne."] },
        { title: "Résultats d’apprentissage", paragraphs: ["Le tuteur fournit des séances avec une préparation et un soin raisonnables. Aucune note, résultat d’examen, admission, performance en compétition ou vitesse de progression précise n’est garantie, car les résultats dépendent de nombreux facteurs, dont la participation et la pratique."] },
        { title: "Matériel et comportement", paragraphs: ["L’élève devrait apporter le matériel pertinent et participer de façon respectueuse. Chaque partie peut interrompre ou reporter une séance si l’environnement est dangereux, inapproprié ou peu propice à l’apprentissage."] },
        { title: "Modifications", paragraphs: ["Ces conditions peuvent être mises à jour lorsque le service évolue. La date ci-dessus indique la version actuelle. Les conditions déjà convenues pour une séance confirmée ne seront pas modifiées rétroactivement."] },
      ],
    },
  },
};
