import { useState } from "react";
import { isRealLink, site } from "../config/site";
import { InstagramIcon } from "./Icons";

export function InstagramButton() {
  const [note, setNote] = useState(false);
  const url = site.instagramUrl.trim();

  if (isRealLink(url)) {
    return (
      <a className="btn btn-secondary" href={url} target="_blank" rel="noreferrer">
        <InstagramIcon />
        Instagram
      </a>
    );
  }

  return (
    <div className="instagram-wrap">
      <a
        className="btn btn-secondary"
        href="#instagram"
        onClick={(event) => {
          event.preventDefault();
          setNote(true);
        }}
      >
        <InstagramIcon />
        Instagram
      </a>
      {note ? (
        <p className="instagram-note" role="status">
          The Instagram link will be added here soon.
        </p>
      ) : null}
    </div>
  );
}
