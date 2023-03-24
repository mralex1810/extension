package caches;

import java.util.Scanner;

public class SaveChanges {

    public static void main(String[] args) {
        System.out.println(args[0]);
        Scanner scanner = new Scanner(System.in);
        while (scanner.hasNextLine()) {
            String line = scanner.nextLine();
            System.out.println(line + "123");
        }
    }
}