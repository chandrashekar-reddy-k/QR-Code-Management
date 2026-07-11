import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { FormSectionWithDots, TextInput } from "../../../components/ui";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import BackButton from "../../../components/common/BackButton";
import { useCreateRouteMap, useUpdateRouteMap } from "../../../hooks/deliverySettings";
import { routeMapSchema } from "../../../validationSchema/deliverySettings/routeMapSchema"; 
interface LocationState {
  routeMap?: { id: number; area: string };
}

const CreateRouteMap = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const isEdit = Boolean(id);

  const createMutation = useCreateRouteMap();
  const updateMutation = useUpdateRouteMap(id);

  const [routeArea, setRouteArea] = useState(state?.routeMap?.area ?? "");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (state?.routeMap?.area != null) setRouteArea(state.routeMap.area);
  }, [state?.routeMap?.area]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRouteArea(e.target.value);
    if (error) setError("");
  };

 const validate = async () => {
  try {
    await routeMapSchema.validate(
      { routeArea },
      { abortEarly: false }
    );

    setError("");
    return true;

  } catch (err: any) {
    setError(err.errors[0]);
    return false;
  }
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const isValid = await validate();
  if (!isValid) return;

  const payload = { area: routeArea.trim() };

  const onSuccess = () =>
    navigate("/delivery-settings/scheduled-delivery");

  if (isEdit && id) {
    updateMutation.mutate(payload, { onSuccess });
  } else {
    createMutation.mutate(payload, { onSuccess });
  }
};

  const handleCancel = () => {
    navigate("/delivery-settings/scheduled-delivery");
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="w-full px-1 sm:px-2 md:px-3 pb-4">
      {/* Page Title */}
      <div className="mb-3 mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
          {isEdit ? "Edit Route Map" : "Create Route Map"}
        </h1>
        <BackButton to="/delivery-settings/scheduled-delivery" />
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4">
        <Breadcrumbs />
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sm:p-6 flex justify-center"
      >
        <div className="w-full max-w-xl">
          <FormSectionWithDots title="Route Map Details">
            <div>
              <TextInput
                label="Route/ Area"
                required
                type="text"
                name="routeArea"
                value={routeArea}
                onChange={handleChange}
                placeholder="Enter Route/Area"
                error={error}
              />
            </div>
          </FormSectionWithDots>

          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateRouteMap;

