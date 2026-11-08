import { useEffect, useState } from "react";
import { downloadPrivateFile } from "../services/profileApi.js";

function usePrivateImage(enabled, version) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    if (!enabled) {
      setUrl("");
      return undefined;
    }

    downloadPrivateFile("photo")
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setUrl("");
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [enabled, version]);

  return url;
}

export default usePrivateImage;
