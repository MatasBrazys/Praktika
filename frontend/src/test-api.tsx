import { useEffect } from "react";
import { formAPI } from "./services/api";

export default function TestApi() {
  useEffect(() => {
    formAPI.list().then(forms => {
      console.log("Forms:", forms);
    });
  }, []);

  return <div>Check browser console</div>;
}
