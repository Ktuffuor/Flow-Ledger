import { firebaseConfig, isFirebaseConfigured } from "./infrastructure/firebaseConfig.js";
import { LocalStorageRepository } from "./infrastructure/LocalStorageRepository.js";
import { FirebaseRepository } from "./infrastructure/FirebaseRepository.js";
import { ExpenseUseCases } from "./application/ExpenseUseCases.js";
import { BackupUseCases } from "./application/BackupUseCases.js";
import { UIController } from "./presentation/UIController.js";

const localRepo = new LocalStorageRepository();
const firebaseRepo = isFirebaseConfigured() ? new FirebaseRepository(firebaseConfig) : null;

const expenseUseCases = new ExpenseUseCases(localRepo);
const backupUseCases = new BackupUseCases(expenseUseCases);

const ui = new UIController({
  expenseUseCases,
  backupUseCases,
  firebaseRepo
});

ui.init();

if (!firebaseRepo) {
  ui.setCloudModeUI({ configured: false, user: null });
  expenseUseCases.start();
} else {
  firebaseRepo.onAuthChange((user) => {
    ui.setCloudModeUI({ configured: true, user });
    if (user) {
      expenseUseCases.setRepository(firebaseRepo);
    }
  });
}