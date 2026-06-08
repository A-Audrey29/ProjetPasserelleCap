import { useState } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import styles from './GuideBilanSection.module.css';
import imgFiche from '@assets/guides/guide-bilan-01-fiche.png';
import imgSection from '@assets/guides/guide-bilan-02-section.png';
import imgPdf from '@assets/guides/guide-bilan-03-pdf.png';
import imgEnregistrer from '@assets/guides/guide-bilan-04-enregistrer.png';
import imgTelecharger from '@assets/guides/guide-bilan-05-telecharger.png';
import imgUpload from '@assets/guides/guide-bilan-06-upload.png';

/**
 * Tuto pas-à-pas : remplir et envoyer le bilan d'un atelier.
 * Section autonome, indépendante du système de FAQ vidéo (pas de modal,
 * pas d'entrée dans videoFaqs.ts) — un seul accordéon : titre + résumé
 * visibles, le détail (étapes + images) se déplie au clic.
 *
 * Ne couvre que le mode d'emploi mécanique de l'outil (où cliquer, quoi
 * télécharger/enregistrer/uploader). Le contenu à écrire dans le bilan
 * relève d'un guide métier séparé, hors scope ici.
 */

const steps = [
  {
    title: 'Trouver la fiche de votre atelier',
    text: "Allez dans « Gestion Ateliers », repérez l'atelier terminé, puis cliquez sur l'icône carrée avec une flèche qui sort (en haut à droite de sa carte). Vous arrivez sur la fiche de l'atelier.",
    image: imgFiche,
    imageAlt: "Liste des ateliers terminés avec l'icône d'ouverture de fiche entourée",
  },
  {
    title: 'Aller à la section « Bilans d\'ateliers »',
    text: "Sur la fiche de l'atelier, faites défiler la page vers le bas (avec la molette de la souris ou le doigt sur l'écran) jusqu'à voir le bloc « Bilans d'ateliers ».",
    image: imgSection,
    imageAlt: "Section « Bilans d'ateliers » avec les 3 étapes à suivre",
  },
  {
    title: 'Télécharger le modèle (template) PDF vierge',
    text: "Dans ce bloc, cliquez sur le bouton vert « Télécharger le template PDF ». Un fichier PDF vide se télécharge sur votre ordinateur.",
    image: imgTelecharger,
    imageAlt: 'Bouton « Télécharger le template PDF » dans le bloc Bilans d\'ateliers',
  },
  {
    title: 'Ouvrir le PDF et remplir les champs',
    text: "Ouvrez le fichier téléchargé sur votre ordinateur. Les zones encadrées sont les endroits où écrire. Cliquez dedans, puis tapez les informations demandées.",
    image: imgPdf,
    imageAlt: 'PDF ouvert avec les champs à remplir surlignés',
  },
  {
    title: 'Enregistrer le fichier rempli',
    text: "Une fois le PDF rempli, enregistrez-le (menu « Fichier » puis « Enregistrer », ou les touches Ctrl+S / Cmd+S). Vous pouvez aussi simplement fermer le fichier : un message vous demandera alors si vous voulez enregistrer — répondez « Oui » ou « Enregistrer ». Dans tous les cas, votre ordinateur va vous demander où ranger le fichier : choisissez un endroit que vous retrouverez facilement, par exemple le dossier « Téléchargements » ou le « Bureau ».",
    image: imgEnregistrer,
    imageAlt: 'Exemple de fenêtre « Enregistrer sous » sur Mac',
    imageCaption: "Exemple sur Mac — l'apparence de cette fenêtre peut être différente sous Windows, mais le principe est le même : choisir un dossier et cliquer sur « Enregistrer ».",
  },
  {
    title: 'Uploader (envoyer) le bilan rempli',
    text: "Retournez sur la fiche de l'atelier, dans le bloc « Bilans d'ateliers ». Cliquez sur le bouton « Uploader le bilan », puis sélectionnez le fichier que vous venez d'enregistrer. C'est terminé : votre bilan est envoyé !",
    image: imgUpload,
    imageAlt: 'Bouton « Uploader le bilan » dans le bloc Bilans d\'ateliers',
  },
];

export function GuideBilanSection() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.section}>
      <button
        className={styles.header}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <FileText className={styles.headerIcon} />
        <div className={styles.headerText}>
          <h2 className={styles.title}>Comment remplir et envoyer le bilan d'un atelier ?</h2>
          <p className={styles.subtitle}>
            Un guide simple, étape par étape, pour télécharger le modèle, le remplir et l'envoyer sur la plateforme.
          </p>
        </div>
        <ChevronDown className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.steps}>
          {steps.map((step, index) => (
            <div key={index} className={styles.step}>
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <span className={styles.stepTitle}>{step.title}</span>
              </div>
              <p className={styles.stepText}>{step.text}</p>
              {step.image && (
                <figure className={styles.figure}>
                  <img
                    src={step.image}
                    alt={step.imageAlt}
                    className={styles.image}
                    loading="lazy"
                  />
                  {step.imageCaption && (
                    <figcaption className={styles.caption}>{step.imageCaption}</figcaption>
                  )}
                </figure>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
