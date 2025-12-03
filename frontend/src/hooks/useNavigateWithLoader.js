import { useNavigate } from "react-router-dom";
import { useMainContext } from "../mainContext";

const useNavigateWithLoader = () => {
  const navigate = useNavigate();
  const { setNavigationLoading } = useMainContext();

  const navigateWithLoader = (to, options = {}) => {
    setNavigationLoading(true);
    setTimeout(() => {
      navigate(to, options);
      setNavigationLoading(false);
    }, 1000); // 1 second delay
  };

  return navigateWithLoader;
};

export default useNavigateWithLoader;
